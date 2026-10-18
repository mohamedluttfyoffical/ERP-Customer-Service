import "dotenv/config";

import {
  BillingInterval,
  BillingProvider,
  CustomFieldType,
  CustomerType,
  KnowledgeStatus,
  MembershipStatus,
  PlanStatus,
  PrismaClient,
  SubscriptionStatus,
  TenantStatus,
  TicketPriority,
  type RoleKey,
} from "@prisma/client";
import { hash } from "bcryptjs";

import { PLAN_CATALOG, PLAN_FEATURES, USAGE_METRICS, type PlanDefinition } from "../src/lib/plans";
import { SYSTEM_ROLE_PERMISSIONS, SYSTEM_ROLES, type StaffRoleKey } from "../src/lib/permissions";

const prisma = new PrismaClient();
const PASSWORD_COST = 12;
const BCRYPT_MAX_BYTES = 72;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[seed] Missing required environment variable: ${name}`);
  }
  return value;
}

function assertPassword(name: string, value: string): string {
  if (value.length < 12) {
    throw new Error(`[seed] ${name} must be at least 12 characters long`);
  }
  if (Buffer.byteLength(value, "utf8") > BCRYPT_MAX_BYTES) {
    throw new Error(`[seed] ${name} exceeds bcrypt's 72-byte limit`);
  }
  return value;
}

function planPriceEnvKey(planCode: string, interval: BillingInterval): string {
  return `STRIPE_PRICE_${planCode}_${interval}`;
}

async function seedPlan(planDefinition: PlanDefinition): Promise<void> {
  const plan = await prisma.plan.upsert({
    where: { code: planDefinition.code },
    update: {
      nameAr: planDefinition.nameAr,
      nameEn: planDefinition.nameEn,
      descriptionAr: planDefinition.descriptionAr,
      descriptionEn: planDefinition.descriptionEn,
      status: PlanStatus.ACTIVE,
      tier: planDefinition.tier,
      trialDays: planDefinition.trialDays,
      annualDiscountPercent: planDefinition.annualDiscountPercent,
      isPopular: planDefinition.isPopular,
      sortOrder: planDefinition.sortOrder,
    },
    create: {
      code: planDefinition.code,
      nameAr: planDefinition.nameAr,
      nameEn: planDefinition.nameEn,
      descriptionAr: planDefinition.descriptionAr,
      descriptionEn: planDefinition.descriptionEn,
      status: PlanStatus.ACTIVE,
      tier: planDefinition.tier,
      trialDays: planDefinition.trialDays,
      annualDiscountPercent: planDefinition.annualDiscountPercent,
      isPopular: planDefinition.isPopular,
      sortOrder: planDefinition.sortOrder,
    },
  });

  await prisma.$transaction([
    prisma.planFeature.deleteMany({
      where: {
        planId: plan.id,
        featureKey: { notIn: [...planDefinition.features] },
      },
    }),
    ...planDefinition.features.map((featureKey) => {
      const feature = PLAN_FEATURES[featureKey];
      return prisma.planFeature.upsert({
        where: { planId_featureKey: { planId: plan.id, featureKey } },
        update: {
          nameAr: feature.nameAr,
          nameEn: feature.nameEn,
          description: feature.description,
          included: true,
        },
        create: {
          planId: plan.id,
          featureKey,
          nameAr: feature.nameAr,
          nameEn: feature.nameEn,
          description: feature.description,
          included: true,
        },
      });
    }),
    prisma.planLimit.deleteMany({
      where: {
        planId: plan.id,
        metric: { notIn: [...USAGE_METRICS] },
      },
    }),
    ...USAGE_METRICS.map((metric) =>
      prisma.planLimit.upsert({
        where: { planId_metric: { planId: plan.id, metric } },
        update: { limitValue: planDefinition.limits[metric] },
        create: {
          planId: plan.id,
          metric,
          limitValue: planDefinition.limits[metric],
        },
      }),
    ),
  ]);

  for (const interval of [BillingInterval.MONTHLY, BillingInterval.ANNUAL] as const) {
    const amount =
      interval === BillingInterval.MONTHLY
        ? planDefinition.prices.MONTHLY
        : planDefinition.prices.ANNUAL;
    const stripePriceId =
      process.env[planPriceEnvKey(planDefinition.code, interval)]?.trim() || null;

    await prisma.planPrice.upsert({
      where: {
        planId_interval_currency: {
          planId: plan.id,
          interval,
          currency: "USD",
        },
      },
      update: {
        amount,
        annualDiscountPercent:
          interval === BillingInterval.ANNUAL ? planDefinition.annualDiscountPercent : null,
        isActive: true,
        ...(stripePriceId ? { stripePriceId } : {}),
      },
      create: {
        planId: plan.id,
        interval,
        currency: "USD",
        amount,
        annualDiscountPercent:
          interval === BillingInterval.ANNUAL ? planDefinition.annualDiscountPercent : null,
        stripePriceId,
      },
    });
  }

  console.info(`[seed] Plan ${planDefinition.code} ready`);
}

async function seedPlans(): Promise<void> {
  for (const planDefinition of PLAN_CATALOG) {
    await seedPlan(planDefinition);
  }
}

async function seedSuperAdmin(): Promise<{ id: string; email: string }> {
  const email = requiredEnv("SEED_SUPER_ADMIN_EMAIL").toLowerCase();
  const password = assertPassword(
    "SEED_SUPER_ADMIN_PASSWORD",
    requiredEnv("SEED_SUPER_ADMIN_PASSWORD"),
  );
  const name = process.env.SEED_SUPER_ADMIN_NAME?.trim() || "Platform Owner";

  const existing = await prisma.user.findUnique({ where: { email } });
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      platformRole: "SUPER_ADMIN",
      isActive: true,
      emailVerified: existing?.emailVerified ?? new Date(),
    },
    create: {
      email,
      name,
      passwordHash: await hash(password, PASSWORD_COST),
      platformRole: "SUPER_ADMIN",
      emailVerified: new Date(),
      locale: "AR",
    },
  });

  if (existing) {
    console.info(`[seed] Super admin exists (${email}); password was not overwritten`);
  } else {
    console.info(`[seed] Super admin created (${email})`);
  }

  return { id: user.id, email: user.email };
}

const ROLE_SLUGS: Record<StaffRoleKey, string> = {
  OWNER: "owner",
  ADMIN: "admin",
  AGENT: "agent",
  TECHNICIAN: "technician",
  BILLING: "billing",
};

async function ensureTenantRoles(tenantId: string) {
  const roles: Record<StaffRoleKey, { id: string }> = {} as Record<StaffRoleKey, { id: string }>;

  for (const roleKey of Object.keys(SYSTEM_ROLE_PERMISSIONS) as StaffRoleKey[]) {
    const meta = SYSTEM_ROLES[roleKey];
    const role = await prisma.role.upsert({
      where: {
        tenantId_slug: {
          tenantId,
          slug: ROLE_SLUGS[roleKey],
        },
      },
      update: {
        key: roleKey as RoleKey,
        name: meta.nameAr,
        description: meta.descriptionAr,
        permissions: [...SYSTEM_ROLE_PERMISSIONS[roleKey]],
        isSystem: true,
        isDefault: roleKey === "AGENT",
      },
      create: {
        tenantId,
        key: roleKey as RoleKey,
        slug: ROLE_SLUGS[roleKey],
        name: meta.nameAr,
        description: meta.descriptionAr,
        permissions: [...SYSTEM_ROLE_PERMISSIONS[roleKey]],
        isSystem: true,
        isDefault: roleKey === "AGENT",
      },
    });
    roles[roleKey] = { id: role.id };
  }

  return roles;
}

async function seedDemoWorkspace(): Promise<void> {
  if (process.env.SEED_DEMO_DATA !== "true") {
    console.info("[seed] Demo workspace skipped (SEED_DEMO_DATA is not true)");
    return;
  }

  const slug = process.env.SEED_DEMO_TENANT_SLUG?.trim().toLowerCase() || "demo";
  const ownerEmail = requiredEnv("SEED_DEMO_OWNER_EMAIL").toLowerCase();
  const ownerPassword = assertPassword(
    "SEED_DEMO_OWNER_PASSWORD",
    requiredEnv("SEED_DEMO_OWNER_PASSWORD"),
  );
  const ownerName = process.env.SEED_DEMO_OWNER_NAME?.trim() || "Demo Owner";
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {
      name: "شركة سند التجريبية",
      legalName: "Sanad Demo Company",
      email: ownerEmail,
    },
    create: {
      slug,
      name: "شركة سند التجريبية",
      legalName: "Sanad Demo Company",
      email: ownerEmail,
      phone: "+966500000000",
      status: TenantStatus.TRIALING,
      defaultLocale: "AR",
      timezone: "Asia/Riyadh",
      currency: "USD",
      countryCode: "SA",
      trialEndsAt,
    },
  });

  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  const demoPasswordHash = await hash(ownerPassword, PASSWORD_COST);
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { isActive: true },
    create: {
      email: ownerEmail,
      name: ownerName,
      passwordHash: demoPasswordHash,
      emailVerified: new Date(),
      locale: "AR",
      timezone: "Asia/Riyadh",
    },
  });

  const roles = await ensureTenantRoles(tenant.id);
  const membership = await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: owner.id } },
    update: {
      roleId: roles.OWNER.id,
      status: MembershipStatus.ACTIVE,
      joinedAt: existingOwner?.createdAt ?? new Date(),
    },
    create: {
      tenantId: tenant.id,
      userId: owner.id,
      roleId: roles.OWNER.id,
      title: "مالك الشركة",
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    },
  });

  if (!existingOwner) {
    console.info(`[seed] Demo owner created (${ownerEmail})`);
  }

  await prisma.tenantSetting.upsert({
    where: { tenantId: tenant.id },
    update: {
      supportEmail: ownerEmail,
      brandPrimaryColor: "#0f766e",
      emailNotifications: true,
      inAppNotifications: true,
      slaWarningMinutes: 60,
    },
    create: {
      tenantId: tenant.id,
      supportEmail: ownerEmail,
      supportPhone: "+966500000000",
      brandPrimaryColor: "#0f766e",
      brandAccentColor: "#14b8a6",
      emailNotifications: true,
      inAppNotifications: true,
      slaWarningMinutes: 60,
    },
  });

  const departmentSeeds = [
    { name: "الدعم الفني", slug: "technical-support", color: "#0f766e", isDefault: true },
    { name: "الفواتير", slug: "billing", color: "#b45309", isDefault: false },
    { name: "المبيعات", slug: "sales", color: "#2563eb", isDefault: false },
    { name: "الصيانة", slug: "maintenance", color: "#7c3aed", isDefault: false },
  ];

  const departments: Record<string, { id: string }> = {};
  for (const departmentSeed of departmentSeeds) {
    const department = await prisma.department.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: departmentSeed.slug } },
      update: {
        name: departmentSeed.name,
        color: departmentSeed.color,
        isActive: true,
      },
      create: {
        tenantId: tenant.id,
        ...departmentSeed,
      },
    });
    departments[departmentSeed.slug] = department;
  }

  const staffSeeds = [
    {
      email: "agent@sanad.local",
      name: "نورة القحطاني",
      roleKey: "AGENT",
      title: "وكيل دعم",
      departmentSlug: "technical-support",
    },
    {
      email: "technician@sanad.local",
      name: "خالد الحربي",
      roleKey: "TECHNICIAN",
      title: "فني صيانة",
      departmentSlug: "maintenance",
    },
    {
      email: "billing@sanad.local",
      name: "ريم الشهري",
      roleKey: "BILLING",
      title: "مسؤول الفواتير",
      departmentSlug: "billing",
    },
  ] as const satisfies ReadonlyArray<{
    email: string;
    name: string;
    roleKey: StaffRoleKey;
    title: string;
    departmentSlug: string;
  }>;

  for (const staff of staffSeeds) {
    const existingStaff = await prisma.user.findUnique({ where: { email: staff.email } });
    const staffUser = await prisma.user.upsert({
      where: { email: staff.email },
      update: { isActive: true },
      create: {
        email: staff.email,
        name: staff.name,
        passwordHash: demoPasswordHash,
        emailVerified: new Date(),
        locale: "AR",
        timezone: "Asia/Riyadh",
      },
    });

    await prisma.membership.upsert({
      where: {
        tenantId_userId: { tenantId: tenant.id, userId: staffUser.id },
      },
      update: {
        roleId: roles[staff.roleKey].id,
        departmentId: departments[staff.departmentSlug].id,
        title: staff.title,
        status: MembershipStatus.ACTIVE,
      },
      create: {
        tenantId: tenant.id,
        userId: staffUser.id,
        roleId: roles[staff.roleKey].id,
        departmentId: departments[staff.departmentSlug].id,
        title: staff.title,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
      },
    });

    if (!existingStaff) {
      console.info(`[seed] Demo ${staff.roleKey.toLowerCase()} created (${staff.email})`);
    }
  }

  const calendar = await prisma.businessCalendar.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "ساعات العمل الافتراضية" } },
    update: { isDefault: true, timezone: "Asia/Riyadh" },
    create: {
      tenantId: tenant.id,
      name: "ساعات العمل الافتراضية",
      timezone: "Asia/Riyadh",
      isDefault: true,
    },
  });

  const workingDays = [7, 1, 2, 3, 4];
  for (const dayOfWeek of [1, 2, 3, 4, 5, 6, 7]) {
    await prisma.businessHour.upsert({
      where: {
        calendarId_dayOfWeek_startMinute: {
          calendarId: calendar.id,
          dayOfWeek,
          startMinute: 540,
        },
      },
      update: { endMinute: 1020, isEnabled: workingDays.includes(dayOfWeek) },
      create: {
        tenantId: tenant.id,
        calendarId: calendar.id,
        dayOfWeek,
        startMinute: 540,
        endMinute: 1020,
        isEnabled: workingDays.includes(dayOfWeek),
      },
    });
  }

  const slaPolicy = await prisma.slaPolicy.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "سياسة SLA الافتراضية" } },
    update: {
      isDefault: true,
      isActive: true,
      businessCalendarId: calendar.id,
      pauseOnPendingCustomer: true,
    },
    create: {
      tenantId: tenant.id,
      name: "سياسة SLA الافتراضية",
      description: "أهداف الاستجابة والحل لكل مستوى أولوية.",
      isDefault: true,
      isActive: true,
      businessCalendarId: calendar.id,
      pauseOnPendingCustomer: true,
    },
  });

  const slaTargets = [
    { priority: TicketPriority.LOW, firstResponseMinutes: 480, resolutionMinutes: 2880 },
    { priority: TicketPriority.MEDIUM, firstResponseMinutes: 240, resolutionMinutes: 1440 },
    { priority: TicketPriority.HIGH, firstResponseMinutes: 60, resolutionMinutes: 480 },
    { priority: TicketPriority.URGENT, firstResponseMinutes: 30, resolutionMinutes: 240 },
  ];

  for (const target of slaTargets) {
    await prisma.slaTarget.upsert({
      where: {
        slaPolicyId_priority: {
          slaPolicyId: slaPolicy.id,
          priority: target.priority,
        },
      },
      update: {
        firstResponseMinutes: target.firstResponseMinutes,
        resolutionMinutes: target.resolutionMinutes,
      },
      create: {
        tenantId: tenant.id,
        slaPolicyId: slaPolicy.id,
        ...target,
      },
    });
  }

  await prisma.department.update({
    where: { id: departments["technical-support"].id },
    data: { defaultSlaPolicyId: slaPolicy.id },
  });

  const tagSeeds = [
    { name: "VIP", slug: "vip", color: "#b45309" },
    { name: "عطل متكرر", slug: "recurring", color: "#b91c1c" },
    { name: "صيانة دورية", slug: "maintenance", color: "#0f766e" },
  ];
  for (const tagSeed of tagSeeds) {
    await prisma.tag.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: tagSeed.slug } },
      update: { name: tagSeed.name, color: tagSeed.color },
      create: { tenantId: tenant.id, ...tagSeed },
    });
  }

  const customFieldSeeds = [
    {
      key: "order_reference",
      labelAr: "رقم الطلب",
      labelEn: "Order reference",
      type: CustomFieldType.TEXT,
    },
    {
      key: "device_type",
      labelAr: "نوع الجهاز",
      labelEn: "Device type",
      type: CustomFieldType.SELECT,
      options: ["حاسوب", "طابعة", "شبكة", "خادم"],
    },
    {
      key: "warranty_expires_on",
      labelAr: "تاريخ انتهاء الضمان",
      labelEn: "Warranty expiry",
      type: CustomFieldType.DATE,
    },
  ];
  for (const fieldSeed of customFieldSeeds) {
    await prisma.customFieldDefinition.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: fieldSeed.key } },
      update: {
        labelAr: fieldSeed.labelAr,
        labelEn: fieldSeed.labelEn,
        type: fieldSeed.type,
        options: fieldSeed.options,
        isActive: true,
      },
      create: {
        tenantId: tenant.id,
        ...fieldSeed,
        options: fieldSeed.options,
      },
    });
  }

  const cannedResponses = [
    {
      shortcut: "/greeting",
      title: "ترحيب أولي",
      body: "أهلًا بك، تم استلام تذكرتك وسيتولى فريق الدعم الرد عليك في أقرب وقت.",
    },
    {
      shortcut: "/need-details",
      title: "طلب تفاصيل إضافية",
      body: "للمساعدة بشكل أسرع، هل يمكنك تزويدنا برقم الجهاز أو الطلب ووصف الخطوات التي أدت للمشكلة؟",
    },
  ];
  for (const cannedResponse of cannedResponses) {
    await prisma.cannedResponse.upsert({
      where: {
        tenantId_shortcut: { tenantId: tenant.id, shortcut: cannedResponse.shortcut },
      },
      update: {
        title: cannedResponse.title,
        body: cannedResponse.body,
        isActive: true,
      },
      create: {
        tenantId: tenant.id,
        ...cannedResponse,
        createdByUserId: owner.id,
      },
    });
  }

  for (const sequenceKey of [
    "ticket",
    "work_order",
    "quotation",
    "sales_invoice",
    "subscription_invoice",
  ]) {
    await prisma.sequence.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: sequenceKey } },
      update: {},
      create: { tenantId: tenant.id, key: sequenceKey },
    });
  }

  const customerEmail = "ops@alnoor.example";
  const existingCustomer = await prisma.customer.findFirst({
    where: { tenantId: tenant.id, email: customerEmail },
    select: { id: true },
  });
  const customerData = {
    name: "شركة النور للتقنية",
    type: CustomerType.COMPANY,
    email: customerEmail,
    phone: "+966511111111",
    website: "https://alnoor.example",
    industry: "تقنية المعلومات",
    status: "ACTIVE" as const,
    ownerMembershipId: membership.id,
    city: "الرياض",
    countryCode: "SA",
    notes: "عميل تجريبي لعرض دورة الدعم وربط الأصول وأوامر العمل.",
  };
  const customer = existingCustomer
    ? await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: customerData,
      })
    : await prisma.customer.create({
        data: { tenantId: tenant.id, ...customerData },
      });

  await prisma.customerContact.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "sara@alnoor.example" } },
    update: {
      customerId: customer.id,
      firstName: "سارة",
      lastName: "العتيبي",
      phone: "+966522222222",
      title: "مديرة العمليات",
      portalEnabled: true,
    },
    create: {
      tenantId: tenant.id,
      customerId: customer.id,
      firstName: "سارة",
      lastName: "العتيبي",
      email: "sara@alnoor.example",
      phone: "+966522222222",
      title: "مديرة العمليات",
      isPrimary: true,
      portalEnabled: true,
    },
  });

  const product = await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: "SRV-ENT-01" } },
    update: {
      name: "خادم Enterprise",
      unitPrice: "18500.00",
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      sku: "SRV-ENT-01",
      name: "خادم Enterprise",
      description: "خادم مؤسسات مع دعم فني وضمان ثلاث سنوات.",
      category: "خوادم",
      unitPrice: "18500.00",
      costPrice: "14000.00",
      currency: "USD",
    },
  });

  await prisma.asset.upsert({
    where: {
      tenantId_serialNumber: {
        tenantId: tenant.id,
        serialNumber: "SN-DEMO-0001",
      },
    },
    update: {
      customerId: customer.id,
      productId: product.id,
      name: "خادم الإنتاج الرئيسي",
      status: "ACTIVE",
    },
    create: {
      tenantId: tenant.id,
      customerId: customer.id,
      productId: product.id,
      name: "خادم الإنتاج الرئيسي",
      serialNumber: "SN-DEMO-0001",
      status: "ACTIVE",
      location: "الرياض - مركز البيانات الرئيسي",
      purchasedAt: new Date("2025-01-15"),
      warrantyStartsAt: new Date("2025-01-15"),
      warrantyEndsAt: new Date("2028-01-15"),
    },
  });

  const kbCategory = await prisma.kbCategory.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "getting-started" } },
    update: {
      nameAr: "البداية السريعة",
      nameEn: "Getting started",
      isPublished: true,
    },
    create: {
      tenantId: tenant.id,
      slug: "getting-started",
      nameAr: "البداية السريعة",
      nameEn: "Getting started",
      descriptionAr: "أساسيات استخدام بوابة الدعم.",
      descriptionEn: "Portal and support basics.",
      sortOrder: 10,
    },
  });

  await prisma.kbArticle.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "how-to-submit-a-ticket" } },
    update: {
      categoryId: kbCategory.id,
      status: KnowledgeStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      tenantId: tenant.id,
      categoryId: kbCategory.id,
      authorUserId: owner.id,
      slug: "how-to-submit-a-ticket",
      titleAr: "كيفية إنشاء تذكرة دعم",
      titleEn: "How to submit a support ticket",
      excerptAr: "دليل سريع لإنشاء تذكرة ومتابعتها من بوابة العميل.",
      excerptEn: "A quick guide to opening and tracking a ticket from the customer portal.",
      contentAr:
        "## إنشاء تذكرة\n1. سجّل الدخول إلى بوابة العميل.\n2. اختر **تذكرة جديدة**.\n3. صف المشكلة وأضف رقم الجهاز إن وُجد.\n4. ستتمكن من متابعة حالة التذكرة والردود في الوقت الفعلي.",
      contentEn:
        "## Submit a ticket\n1. Sign in to the customer portal.\n2. Select **New ticket**.\n3. Describe the issue and include the device serial number.\n4. Track status and replies in real time.",
      status: KnowledgeStatus.PUBLISHED,
      keywords: ["ticket", "support", "تذكرة", "دعم"],
      publishedAt: new Date(),
    },
  });

  const existingFaq = await prisma.kbFaq.findFirst({
    where: {
      tenantId: tenant.id,
      questionAr: "ما هي مدة الاستجابة المتوقعة؟",
    },
  });
  if (existingFaq) {
    await prisma.kbFaq.update({
      where: { id: existingFaq.id },
      data: { categoryId: kbCategory.id, isPublished: true },
    });
  } else {
    await prisma.kbFaq.create({
      data: {
        tenantId: tenant.id,
        categoryId: kbCategory.id,
        questionAr: "ما هي مدة الاستجابة المتوقعة؟",
        questionEn: "What response time should I expect?",
        answerAr:
          "تختلف مدة الاستجابة حسب أولوية التذكرة. الأولوية العاجلة خلال 30 دقيقة، والعالية خلال ساعة واحدة، خلال ساعات العمل.",
        answerEn:
          "Response time depends on priority: urgent within 30 minutes and high within one hour during business hours.",
        sortOrder: 10,
      },
    });
  }

  const professionalPlan = await prisma.plan.findUnique({
    where: { code: "PROFESSIONAL" },
    include: { prices: { where: { interval: BillingInterval.MONTHLY, currency: "USD" } } },
  });
  if (!professionalPlan || !professionalPlan.prices[0]) {
    throw new Error("[seed] Professional plan price missing; seed plans first");
  }

  const existingSubscription = await prisma.subscription.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });
  if (!existingSubscription) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: professionalPlan.id,
        planPriceId: professionalPlan.prices[0].id,
        interval: BillingInterval.MONTHLY,
        status: SubscriptionStatus.TRIALING,
        provider: BillingProvider.MANUAL,
        seats: 5,
        unitAmount: professionalPlan.prices[0].amount,
        currency: "USD",
        trialStart: new Date(),
        trialEnd: tenant.trialEndsAt ?? trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: tenant.trialEndsAt ?? trialEndsAt,
      },
    });
  }

  await prisma.sequence.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: "customer" } },
    update: {},
    create: { tenantId: tenant.id, key: "customer" },
  });

  console.info(`[seed] Demo workspace ready: /${tenant.slug} (owner: ${ownerEmail})`);
}

async function main(): Promise<void> {
  console.info("[seed] Starting Sanad ERP seed");
  await seedPlans();
  await seedSuperAdmin();
  await seedDemoWorkspace();
  console.info("[seed] Completed successfully");
}

main()
  .catch((error: unknown) => {
    console.error("[seed] Failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
