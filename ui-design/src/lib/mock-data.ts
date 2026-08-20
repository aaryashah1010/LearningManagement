// Placeholder data — no backend wired yet. Shared across admin pages so the
// same class/teacher shows up consistently everywhere it's referenced.

export interface MockTeacher {
  id: string;
  name: string;
  email: string;
}

export interface MockStudent {
  id: string;
  name: string;
  dateOfBirth: string;
  contact: string;
}

export interface MockClass {
  id: string;
  name: string;
  teacherId: string | null;
  enrolled: number;
  roster: MockStudent[];
}

export const MOCK_TEACHERS: MockTeacher[] = [
  { id: "t1", name: "Aarya Shah", email: "aarya.shah@tuition.in" },
  { id: "t2", name: "Rohan Mehta", email: "rohan.mehta@tuition.in" },
  { id: "t3", name: "Priya Nair", email: "priya.nair@tuition.in" },
  { id: "t4", name: "Karan Bhatt", email: "karan.bhatt@tuition.in" },
];

function sampleRoster(seed: string, count: number): MockStudent[] {
  const firstNames = ["Ishaan", "Diya", "Vihaan", "Ananya", "Aryan", "Myra", "Kabir", "Saanvi"];
  const lastNames = ["Kapoor", "Reddy", "Joshi", "Iyer", "Menon", "Desai", "Verma", "Pillai"];
  return Array.from({ length: Math.min(count, 6) }).map((_, i) => {
    const first = firstNames[(i + seed.length) % firstNames.length];
    const last = lastNames[(i * 3 + seed.length) % lastNames.length];
    return {
      id: `${seed}-s${i + 1}`,
      name: `${first} ${last}`,
      dateOfBirth: `20${10 + ((i + seed.length) % 5)}-0${(i % 9) + 1}-1${i}`,
      contact: `9${800000000 + i * 137 + seed.length}`,
    };
  });
}

export const MOCK_CLASSES: MockClass[] = [
  { id: "c1", name: "Class 10 · Mathematics", teacherId: "t1", enrolled: 28, roster: sampleRoster("c1", 28) },
  { id: "c2", name: "Class 10 · Science", teacherId: "t2", enrolled: 26, roster: sampleRoster("c2", 26) },
  { id: "c3", name: "Class 9 · Mathematics", teacherId: "t1", enrolled: 24, roster: sampleRoster("c3", 24) },
  { id: "c4", name: "Class 9 · Social Science", teacherId: null, enrolled: 19, roster: sampleRoster("c4", 19) },
  { id: "c5", name: "Class 8 · English", teacherId: "t3", enrolled: 22, roster: sampleRoster("c5", 22) },
  { id: "c6", name: "Class 8 · Science", teacherId: "t2", enrolled: 25, roster: sampleRoster("c6", 25) },
];

export function teacherName(teacherId: string | null): string | null {
  return MOCK_TEACHERS.find((t) => t.id === teacherId)?.name ?? null;
}

export function classById(classId: string): MockClass | undefined {
  return MOCK_CLASSES.find((c) => c.id === classId);
}

export function classesForTeacher(teacherId: string): MockClass[] {
  return MOCK_CLASSES.filter((c) => c.teacherId === teacherId);
}

// Stand-in for the logged-in teacher until real auth is wired up.
export const CURRENT_TEACHER_ID = "t1";

// --- Tests & questions (docs/omr-grading.md § 9, § 12) ---------------------

export type QuestionOption = "A" | "B" | "C" | "D";
export type TestStatus = "draft" | "published";

export interface MockQuestion {
  id: string;
  number: number;
  text: string;
  correctAnswer: QuestionOption;
  nodePath: string;
  confidence: "high" | "low";
}

export interface MockTest {
  id: string;
  classId: string;
  title: string;
  status: TestStatus;
  questionCount: number;
  createdAt: string;
  questions: MockQuestion[];
}

// The exact worked example from omr-grading.md § 12 "Teacher Review".
const TEST_4_QUESTIONS: MockQuestion[] = [
  { id: "c1-t4-q1", number: 1, text: "Factorise: x² + 5x + 6", correctAnswer: "B", nodePath: "Algebra / Polynomials / Factorisation", confidence: "high" },
  { id: "c1-t4-q2", number: 2, text: "A tangent is drawn from an external point to a circle of radius 5 cm...", correctAnswer: "C", nodePath: "Geometry / Circles / Tangents", confidence: "low" },
  { id: "c1-t4-q3", number: 3, text: "Two triangles are similar if...", correctAnswer: "A", nodePath: "Geometry / Triangles / Similarity", confidence: "high" },
  { id: "c1-t4-q4", number: 4, text: "Find the mean of the following grouped data.", correctAnswer: "D", nodePath: "Statistics / Data Handling / Mean", confidence: "high" },
];

export const MOCK_TESTS: MockTest[] = [
  { id: "test-1", classId: "c1", title: "Test 4 — Circles & Trigonometry", status: "published", questionCount: 20, createdAt: "2026-07-18", questions: TEST_4_QUESTIONS },
  { id: "test-2", classId: "c1", title: "Test 5 — Statistics", status: "draft", questionCount: 15, createdAt: "2026-08-12", questions: [] },
  { id: "test-3", classId: "c3", title: "Unit Test 2 — Algebra", status: "published", questionCount: 18, createdAt: "2026-07-02", questions: [] },
  { id: "test-4", classId: "c1", title: "Weekly Test — Ratios & Proportions", status: "published", questionCount: 12, createdAt: "2026-08-20", questions: [] },
];

export function testsForTeacher(teacherId: string): MockTest[] {
  const classIds = new Set(classesForTeacher(teacherId).map((c) => c.id));
  return MOCK_TESTS.filter((t) => classIds.has(t.classId));
}

export function testById(testId: string): MockTest | undefined {
  return MOCK_TESTS.find((t) => t.id === testId);
}

export function publishedTestsForClass(classId: string): MockTest[] {
  return MOCK_TESTS.filter((t) => t.classId === classId && t.status === "published");
}

// --- Submissions (docs/omr-grading.md § 8, § 15-16) -------------------------

export interface MockAnswer {
  questionId: string;
  questionNumber: number;
  studentAnswer: QuestionOption | null;
  correctAnswer: QuestionOption;
  confidence: "high" | "low";
  needsReview: boolean;
}

export interface MockSubmission {
  id: string;
  testId: string;
  studentId: string;
  studentName: string;
  score: number;
  submittedAt: string;
  answers: MockAnswer[];
}

export const MOCK_SUBMISSIONS: MockSubmission[] = [
  {
    id: "sub-1",
    testId: "test-1",
    studentId: "c1-s1",
    studentName: "Ishaan Kapoor",
    score: 90,
    submittedAt: "2026-08-19T09:12:00",
    answers: [
      { questionId: "c1-t4-q1", questionNumber: 1, studentAnswer: "B", correctAnswer: "B", confidence: "high", needsReview: false },
      { questionId: "c1-t4-q2", questionNumber: 2, studentAnswer: "C", correctAnswer: "C", confidence: "high", needsReview: false },
      { questionId: "c1-t4-q3", questionNumber: 3, studentAnswer: "A", correctAnswer: "A", confidence: "high", needsReview: false },
      { questionId: "c1-t4-q4", questionNumber: 4, studentAnswer: "D", correctAnswer: "D", confidence: "high", needsReview: false },
    ],
  },
  {
    id: "sub-2",
    testId: "test-1",
    studentId: "c1-s2",
    studentName: "Diya Reddy",
    score: 65,
    submittedAt: "2026-08-19T09:31:00",
    answers: [
      { questionId: "c1-t4-q1", questionNumber: 1, studentAnswer: "B", correctAnswer: "B", confidence: "high", needsReview: false },
      { questionId: "c1-t4-q2", questionNumber: 2, studentAnswer: "B", correctAnswer: "C", confidence: "low", needsReview: true },
      { questionId: "c1-t4-q3", questionNumber: 3, studentAnswer: null, correctAnswer: "A", confidence: "low", needsReview: true },
      { questionId: "c1-t4-q4", questionNumber: 4, studentAnswer: "D", correctAnswer: "D", confidence: "high", needsReview: false },
    ],
  },
  {
    id: "sub-3",
    testId: "test-1",
    studentId: "c1-s3",
    studentName: "Vihaan Joshi",
    score: 75,
    submittedAt: "2026-08-19T10:02:00",
    answers: [
      { questionId: "c1-t4-q1", questionNumber: 1, studentAnswer: "A", correctAnswer: "B", confidence: "high", needsReview: false },
      { questionId: "c1-t4-q2", questionNumber: 2, studentAnswer: "C", correctAnswer: "C", confidence: "high", needsReview: false },
      { questionId: "c1-t4-q3", questionNumber: 3, studentAnswer: "A", correctAnswer: "A", confidence: "high", needsReview: false },
      { questionId: "c1-t4-q4", questionNumber: 4, studentAnswer: "D", correctAnswer: "D", confidence: "high", needsReview: false },
    ],
  },
];

export function submissionsForTest(testId: string): MockSubmission[] {
  return MOCK_SUBMISSIONS.filter((s) => s.testId === testId);
}

export function submissionById(submissionId: string): MockSubmission | undefined {
  return MOCK_SUBMISSIONS.find((s) => s.id === submissionId);
}

export function submissionForStudentAndTest(
  studentId: string,
  testId: string
): MockSubmission | undefined {
  return MOCK_SUBMISSIONS.find((s) => s.studentId === studentId && s.testId === testId);
}

// Stand-in for the logged-in student until real auth is wired up.
export const CURRENT_STUDENT_ID = "c1-s2";
export const CURRENT_STUDENT_CLASS_ID = "c1";

// --- Weak-topic reports (docs/omr-grading.md § 18-19) -----------------------

export interface TopicNode {
  name: string;
  accuracy: number;
  studentsStruggling?: number;
  studentsTotal?: number;
  children?: TopicNode[];
}

export function flattenTopicLeaves(nodes: TopicNode[]): TopicNode[] {
  return nodes.flatMap((n) => (n.children ? flattenTopicLeaves(n.children) : [n]));
}

export function topicPathTo(
  nodes: TopicNode[],
  target: TopicNode,
  trail: string[] = []
): string[] | null {
  for (const node of nodes) {
    const nextTrail = [...trail, node.name];
    if (node === target) return nextTrail;
    if (node.children) {
      const found = topicPathTo(node.children, target, nextTrail);
      if (found) return found;
    }
  }
  return null;
}

export const CLASS_WEAK_TOPICS: Record<string, TopicNode[]> = {
  c1: [
    { name: "Algebra", accuracy: 78 },
    {
      name: "Geometry",
      accuracy: 59,
      children: [
        { name: "Triangles", accuracy: 74 },
        {
          name: "Circles",
          accuracy: 43,
          children: [
            { name: "Chords", accuracy: 70 },
            { name: "Angles", accuracy: 55 },
            { name: "Tangents", accuracy: 31, studentsStruggling: 20, studentsTotal: 28 },
          ],
        },
      ],
    },
    { name: "Statistics", accuracy: 82 },
    { name: "Trigonometry", accuracy: 42 },
  ],
  c3: [
    { name: "Algebra", accuracy: 64 },
    { name: "Number Systems", accuracy: 81 },
  ],
};

// A student's own report — same tree shape as the class-wide one, but rolled
// up from just their own result rows (curriculum-taxonomy.md § Data Model).
export const STUDENT_WEAK_TOPICS: Record<string, TopicNode[]> = {
  "c1-s2": [
    { name: "Algebra", accuracy: 82 },
    {
      name: "Geometry",
      accuracy: 48,
      children: [
        { name: "Triangles", accuracy: 40 },
        {
          name: "Circles",
          accuracy: 35,
          children: [
            { name: "Chords", accuracy: 60 },
            { name: "Tangents", accuracy: 20 },
          ],
        },
      ],
    },
    { name: "Statistics", accuracy: 88 },
  ],
};

// Historical accuracy for a student's weakest node, test over test — the
// worked example from omr-grading.md § 23.
export const STUDENT_TOPIC_HISTORY: Record<string, { label: string; value: number }[]> = {
  "c1-s2": [
    { label: "Test 1", value: 35 },
    { label: "Test 2", value: 48 },
    { label: "Test 3", value: 61 },
    { label: "Test 4", value: 74 },
  ],
};
