from typing import Protocol

from app.database.pool import fetch_all
from app.models.curriculum_node import ChapterNode, SubtopicNode, TopicNode
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("curriculum_node_repository")


class ICurriculumNodeRepository(Protocol):
    def get_tree(self, book_id: int) -> Result[list[ChapterNode], AppError]: ...


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


CurriculumNodeRepository: ICurriculumNodeRepository = CurriculumNodeRepositoryImpl()
