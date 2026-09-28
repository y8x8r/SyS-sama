import { PrismaClient } from "@prisma/client";
import { fakerAR } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("جاري توليد 1000 عميل ببيانات واقعية...");
  
  const customers = [];
  const yemeniPrefixes = ['77', '73', '71', '78', '70'];

  for (let i = 0; i < 1000; i++) {
    const prefix = yemeniPrefixes[Math.floor(Math.random() * yemeniPrefixes.length)];
    const randomPhone = `${prefix}${fakerAR.string.numeric(7)}`;
    
    // توليد رقم عميل فريد لتجنب تكرار الحقل customerNumber
    const uniqueCustomerNumber = `CUST-${Date.now().toString().slice(-6)}-${i}`;
    
    customers.push({
      customerNumber: uniqueCustomerNumber,
      fullName: fakerAR.person.fullName(),
      phoneNumber: randomPhone,
      joinedOn: new Date(),
      isActive: true
    });
  }

  console.log("جاري إدخال العملاء إلى قاعدة البيانات دفعة واحدة...");
  
  // استخدام prisma.customer ليتطابق مع نموذج Customer في المخطط
  const result = await prisma.customer.createMany({
    data: customers,
    skipDuplicates: true,
  });

  console.log(`تم إضافة ${result.count} عميل بنجاح!`);
}

main()
  .catch((e) => {
    console.error("حدث خطأ أثناء الإضافة:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });