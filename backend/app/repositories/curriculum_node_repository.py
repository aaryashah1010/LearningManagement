from typing import Protocol

from app.database.pool import fetch_all, fetch_one
from app.models.curriculum_node import ChapterNode, CurriculumNode, SubtopicNode, TopicNode
from app.models.llm import TaxonomyNode
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("curriculum_node_repository")


class ICurriculumNodeRepository(Protocol):
    def get_tree(self, book_id: int) -> Result[list[ChapterNode], AppError]: ...
    def list_flat(self, book_id: int) -> Result[list[TaxonomyNode], AppError]: ...
    def find_by_id(self, node_id: int) -> Result[CurriculumNode, AppError]: ...


class CurriculumNodeRepositoryImpl(ICurriculumNodeRepository):
    def get_tree(self, book_id: int) -> Result[list[ChapterNode], AppError]:
        try:
            rows = fetch_all(
                "SELECT * FROM curriculum_nodes WHERE book_id = %s ORDER BY id ASC",
                (book_id,),
            )
            subtopics_by_topic: dict[int, list[SubtopicNode]] = {}
            for row in rows:
                if row["level"] == "subtopic":
                    subtopics_by_topic.setdefault(row["parent_id"], []).append(
                        SubtopicNode(
                            id=row["id"],
                            name=row["name"],
                            page_start=row["page_start"],
                            page_end=row["page_end"],
                        )
                    )

            topics_by_chapter: dict[int, list[TopicNode]] = {}
            for row in rows:
                if row["level"] == "topic":
                    topics_by_chapter.setdefault(row["parent_id"], []).append(
                        TopicNode(
                            id=row["id"],
                            name=row["name"],
                            page_start=row["page_start"],
                            page_end=row["page_end"],
                            subtopics=subtopics_by_topic.get(row["id"], []),
                        )
                    )

            chapters = [
                ChapterNode(
                    id=row["id"],
                    name=row["name"],
                    page_start=row["page_start"],
                    page_end=row["page_end"],
                    topics=topics_by_chapter.get(row["id"], []),
                )
                for row in rows
                if row["level"] == "chapter"
            ]
            return ok(chapters)
        except Exception:
            logger.exception("Error building curriculum tree")
            return err(ERRORS["DATABASE_ERROR"])

    def list_flat(self, book_id: int) -> Result[list[TaxonomyNode], AppError]:
        tree_result = self.get_tree(book_id)
        if tree_result.is_err():
            return err(tree_result.error)

        flat: list[TaxonomyNode] = []
        for chapter in tree_result.value:
            for topic in chapter.topics:
                if topic.subtopics:
                    for subtopic in topic.subtopics:
                        flat.append(
                            TaxonomyNode(
                                id=subtopic.id, path=f"{chapter.name} > {topic.name} > {subtopic.name}"
                            )
                        )
                else:
                    # A topic with no subtopics is itself the leaf a question maps to.
                    flat.append(TaxonomyNode(id=topic.id, path=f"{chapter.name} > {topic.name}"))
        return ok(flat)

    def find_by_id(self, node_id: int) -> Result[CurriculumNode, AppError]:
        try:
            row = fetch_one("SELECT * FROM curriculum_nodes WHERE id = %s", (node_id,))
            if row is None:
                return err(ERRORS["CURRICULUM_NODE_NOT_FOUND"])
            return ok(CurriculumNode(**row))
        except Exception:
            logger.exception("Error finding curriculum node by id")
            return err(ERRORS["DATABASE_ERROR"])


CurriculumNodeRepository: ICurriculumNodeRepository = CurriculumNodeRepositoryImpl()
