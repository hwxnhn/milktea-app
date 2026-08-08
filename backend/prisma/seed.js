const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Đang tạo dữ liệu mẫu...');

  // 1. Tạo Khách hàng mẫu
  const khachHang = await prisma.kHACH_HANG.upsert({
    where: { MA_KH: 'KH001' },
    update: {},
    create: {
      MA_KH: 'KH001',
      TEN: 'Nguyễn Văn A',
      SDT: '0901234567',
      EMAIL: 'nguyenvana@gmail.com',
    },
  });

  // 2. Tạo Sản phẩm mẫu
  const sanPham = await prisma.sAN_PHAM.upsert({
    where: { MA_SP: 'SP001' },
    update: {},
    create: {
      MA_SP: 'SP001',
      TEN_SP: 'Trà Sữa Trân Châu Đường Đen',
      GIA_BAN: 35000,
      DANH_MUC: 'Trà sữa',
      TRANG_THAI_MON: true,
    },
  });

  console.log('✅ Đã nạp thành công:');
  console.log('- Khách hàng:', khachHang.TEN);
  console.log('- Sản phẩm:', sanPham.TEN_SP);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });