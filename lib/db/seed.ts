import { db } from "./index"
import { PaperAttempt } from "@/types/domain"

export async function seedDummyData() {
  await db.paperAttempts.clear()

  const dummyAttempts: PaperAttempt[] = [
    {
      id: crypto.randomUUID(),
      userId: "demo-user",
      subjectCode: "0620",
      year: 2022,
      session: "May/June",
      variant: "11",
      paperNumber: 2,
      marksScored: 65,
      marksAttempted: 80,
      officialTotal: 80,
      completionStatus: "complete",
      difficulty: 6,
      dateLogged: new Date("2023-01-10")
    },
    {
      id: crypto.randomUUID(),
      userId: "demo-user",
      subjectCode: "0625",
      year: 2022,
      session: "Oct/Nov",
      variant: "12",
      paperNumber: 4,
      marksScored: 58,
      marksAttempted: 80,
      officialTotal: 80,
      completionStatus: "complete",
      difficulty: 7,
      dateLogged: new Date("2023-02-14")
    },
    {
      id: crypto.randomUUID(),
      userId: "demo-user",
      subjectCode: "0607",
      year: 2021,
      session: "May/June",
      variant: "11",
      paperNumber: 3,
      marksScored: 72,
      marksAttempted: 80,
      officialTotal: 80,
      completionStatus: "complete",
      difficulty: 5,
      dateLogged: new Date("2023-03-18")
    },
    {
      id: crypto.randomUUID(),
      userId: "demo-user",
      subjectCode: "0620",
      year: 2023,
      session: "May/June",
      variant: "13",
      paperNumber: 4,
      marksScored: 60,
      marksAttempted: 80,
      officialTotal: 80,
      completionStatus: "complete",
      difficulty: 8,
      dateLogged: new Date("2023-04-22")
    },
    {
      id: crypto.randomUUID(),
      userId: "demo-user",
      subjectCode: "0625",
      year: 2023,
      session: "Feb/March",
      variant: "11",
      paperNumber: 2,
      marksScored: 40,
      marksAttempted: 80,
      officialTotal: 80,
      completionStatus: "partial",
      difficulty: 9,
      dateLogged: new Date("2023-05-12")
    },
    {
      id: crypto.randomUUID(),
      userId: "demo-user",
      subjectCode: "0607",
      year: 2023,
      session: "Oct/Nov",
      variant: "12",
      paperNumber: 6,
      marksScored: 75,
      marksAttempted: 80,
      officialTotal: 80,
      completionStatus: "complete",
      difficulty: 4,
      dateLogged: new Date("2023-06-30")
    }
  ]

  await db.paperAttempts.bulkAdd(dummyAttempts)

  console.log("Dummy data seeded successfully.")
}