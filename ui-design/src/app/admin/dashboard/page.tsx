import type { Metadata } from "next";
import { AlertIcon, CheckIcon, ClassesIcon, StudentsIcon, TeachersIcon } from "@/components/icons";
import { ClassRosterChart } from "@/components/charts/ClassRosterChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { StatTile } from "@/components/charts/StatTile";
import { MOCK_CLASSES, MOCK_TEACHERS, teacherName } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Admin dashboard" };

// Placeholder data — no backend wired yet.
const ENROLLMENT_TREND = [
  { label: "Mar", value: 142 },
  { label: "Apr", value: 158 },
  { label: "May", value: 171 },
  { label: "Jun", value: 189 },
  { label: "Jul", value: 201 },
  { label: "Aug", value: 214 },
];

// "Capacity" isn't a real column (see database-design.md) — it's a chart-only
// illustrative figure so the roster pictogram has room to show empty seats.
const ROSTER_CAPACITY: Record<string, number> = {
  c1: 30,
  c2: 30,
  c3: 28,
  c4: 28,
  c5: 25,
  c6: 25,
};

const CLASS_ROSTER = MOCK_CLASSES.map((c) => ({
  name: c.name,
  teacher: teacherName(c.teacherId),
  enrolled: c.enrolled,
  capacity: ROSTER_CAPACITY[c.id] ?? c.enrolled,
}));

const TOTAL_STUDENTS = MOCK_CLASSES.reduce((sum, c) => sum + c.enrolled, 0);
const UNASSIGNED_CLASSES = MOCK_CLASSES.filter((c) => !c.teacherId).length;

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Teachers"
          value={String(MOCK_TEACHERS.length)}
          delta={{ text: "+1 this month", direction: "up" }}
          icon={<TeachersIcon className="h-4 w-4" />}
        />
        <StatTile
          label="Students"
          value={String(TOTAL_STUDENTS)}
          delta={{ text: "+30 this month", direction: "up" }}
          icon={<StudentsIcon className="h-4 w-4" />}
        />
        <StatTile
          label="Classes"
          value={String(MOCK_CLASSES.length)}
          delta={{ text: "Across 3 grades", direction: "flat" }}
          icon={<ClassesIcon className="h-4 w-4" />}
        />
        <StatTile
          label="Needs attention"
          value={String(UNASSIGNED_CLASSES)}
          delta={{
            text: UNASSIGNED_CLASSES > 0 ? "Class without a teacher" : "Every class is staffed",
            direction: UNASSIGNED_CLASSES > 0 ? "down" : "flat",
          }}
          status={UNASSIGNED_CLASSES > 0 ? "attention" : "good"}
          icon={
            UNASSIGNED_CLASSES > 0 ? (
              <AlertIcon className="h-4 w-4" />
            ) : (
              <CheckIcon className="h-4 w-4" />
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
        <TrendChart
          title="Enrollment growth"
          periodLabel="Last 6 months"
          unitLabel="students"
          data={ENROLLMENT_TREND}
        />
        <ClassRosterChart title="Class roster" rows={CLASS_ROSTER} />
      </div>
    </div>
  );
}
