import { SubmissionsIcon } from "@/components/icons";
import { formatDate } from "@/lib/format-date";
import type { MockSubmission, MockTest } from "@/lib/mock-data";

export function TestAction({
  test,
  submission,
}: {
  test: MockTest;
  submission: MockSubmission | null;
}) {
  if (submission) {
    const correctCount = submission.answers.filter(
      (a) => a.studentAnswer === a.correctAnswer
    ).length;

    return (
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="font-display text-2xl text-ink dark:text-paper">{test.title}</h2>
          <p className="mt-1 text-sm text-ink/55 dark:text-paper/55">
            Submitted {formatDate(submission.submittedAt)} ·{" "}
            <span className="font-semibold text-chart-green">{submission.score}%</span> ·{" "}
            {correctCount}/{submission.answers.length} correct
          </p>
        </div>

        {test.questions.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-ink/10 dark:border-paper/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-ink/[0.02] text-xs uppercase tracking-wide text-ink/45 dark:border-paper/10 dark:bg-paper/[0.03] dark:text-paper/45">
                  <th className="px-5 py-3 font-medium">Q</th>
                  <th className="px-5 py-3 font-medium">Topic</th>
                  <th className="px-5 py-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {submission.answers.map((answer) => {
                  const question = test.questions.find((q) => q.id === answer.questionId);
                  const isCorrect = answer.studentAnswer === answer.correctAnswer;
                  return (
                    <tr
                      key={answer.questionId}
                      className="border-b border-ink/8 last:border-0 dark:border-paper/8"
                    >
                      <td className="px-5 py-3.5 font-utility text-xs text-ink/50 dark:text-paper/50">
                        {answer.questionNumber}
                      </td>
                      <td className="px-5 py-3.5 text-ink/70 dark:text-paper/70">
                        {question?.nodePath ?? "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`font-utility text-[11px] font-medium uppercase tracking-wide ${
                            isCorrect ? "text-chart-green" : "text-mark"
                          }`}
                        >
                          {isCorrect ? "Correct" : "Wrong"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl text-ink dark:text-paper">{test.title}</h2>
        <p className="mt-1 text-sm text-ink/55 dark:text-paper/55">
          {test.questionCount} questions
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-ink/15 py-16 text-center dark:border-paper/15">
        <SubmissionsIcon className="h-8 w-8 text-ink/30 dark:text-paper/30" />
        <div>
          <p className="font-display text-lg text-ink dark:text-paper">Not graded yet</p>
          <p className="mt-1 max-w-sm text-sm text-ink/55 dark:text-paper/55">
            Your teacher uploads the whole class&rsquo;s answer sheets together —
            check back once they have.
          </p>
        </div>
      </div>
    </div>
  );
}
