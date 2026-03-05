import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: "demo-tenant-1" },
    update: {},
    create: {
      id: "demo-tenant-1",
      name: "Demo Company",
    },
  });

  const passwordHash = await hash("demo1234", 12);
  await prisma.user.upsert({
    where: { id: "demo-user-1" },
    update: {},
    create: {
      id: "demo-user-1",
      tenantId: tenant.id,
      email: "admin@democompany.com",
      passwordHash,
      role: "owner",
    },
  });

  const site = await prisma.site.upsert({
    where: { tenantId_domain: { tenantId: tenant.id, domain: "demo.example.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      domain: "demo.example.com",
    },
  });

  await prisma.widgetConfig.upsert({
    where: { siteId: site.id },
    update: {},
    create: {
      siteId: site.id,
      botName: "LeadBot",
      primaryColor: "#2563eb",
      greetingText: "Hi! How can I help you today?",
      offlineMessage: "We're offline. Leave your details and we'll get back to you.",
      qualificationQuestions: [
        { id: "q1", question: "What brings you here today?", required: true },
        { id: "q2", question: "What's your timeline?", required: false },
      ],
      leadThreshold: 60,
      businessHoursStart: 8,
      businessHoursEnd: 16,
      collectEmailPhoneFirst: true,
    },
  });

  console.log("Seed complete. Demo tenant:", tenant.id, "Site ID (use for widget):", site.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
