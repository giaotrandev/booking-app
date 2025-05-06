import fs from 'fs';
import { prisma } from '#src/config/db';

const provinceCoordinates: { [key: string]: { latitude: number; longitude: number } } = {
  // Miền Bắc
  'Hà Nội': { latitude: 21.0278, longitude: 105.8342 },
  'Hải Phòng': { latitude: 20.8449, longitude: 106.6881 },
  'Hải Dương': { latitude: 20.9417, longitude: 106.3286 },
  'Bắc Ninh': { latitude: 21.1231, longitude: 106.0938 },
  'Bắc Giang': { latitude: 21.2787, longitude: 106.1933 },
  'Quảng Ninh': { latitude: 20.9714, longitude: 107.05 },
  'Lạng Sơn': { latitude: 21.8531, longitude: 106.7619 },
  'Cao Bằng': { latitude: 22.6667, longitude: 106.2667 },
  'Thái Nguyên': { latitude: 21.5803, longitude: 105.8287 },
  'Tuyên Quang': { latitude: 22.1856, longitude: 105.3217 },
  'Yên Bái': { latitude: 21.7281, longitude: 104.9056 },
  'Sơn La': { latitude: 21.3261, longitude: 104.1333 },
  'Lai Châu': { latitude: 22.3833, longitude: 103.45 },
  'Điện Biên': { latitude: 21.3833, longitude: 103.0167 },
  'Hòa Bình': { latitude: 20.8078, longitude: 105.3386 },

  // Miền Trung
  'Đà Nẵng': { latitude: 16.0544, longitude: 108.2022 },
  Huế: { latitude: 16.4674, longitude: 107.595 },
  'Quảng Nam': { latitude: 15.5322, longitude: 108.0717 },
  'Quảng Ngãi': { latitude: 15.1194, longitude: 108.775 },
  'Bình Định': { latitude: 13.7712, longitude: 109.0199 },
  'Phú Yên': { latitude: 13.0893, longitude: 109.0433 },
  'Khánh Hòa': { latitude: 12.2676, longitude: 109.0935 },
  'Ninh Thuận': { latitude: 11.5566, longitude: 108.9882 },
  'Bình Thuận': { latitude: 11.0938, longitude: 108.2625 },

  // Miền Nam
  'Hồ Chí Minh': { latitude: 10.8231, longitude: 106.6297 },
  'Cần Thơ': { latitude: 10.0452, longitude: 105.7469 },
  'Đồng Nai': { latitude: 10.9472, longitude: 106.8478 },
  'Bà Rịa-Vũng Tàu': { latitude: 10.5768, longitude: 107.2381 },
  'Bình Dương': { latitude: 10.9799, longitude: 106.6667 },
  'Bình Phước': { latitude: 11.7436, longitude: 106.7211 },
  'Tây Ninh': { latitude: 11.3255, longitude: 106.1161 },
  'An Giang': { latitude: 10.3707, longitude: 105.4194 },
  'Kiên Giang': { latitude: 10.0164, longitude: 105.1333 },
  'Cà Mau': { latitude: 9.1233, longitude: 105.1527 },
  'Bạc Liêu': { latitude: 9.2959, longitude: 105.7153 },
  'Sóc Trăng': { latitude: 9.6034, longitude: 105.9752 },
  'Trà Vinh': { latitude: 9.9548, longitude: 106.3444 },
  'Hậu Giang': { latitude: 9.7875, longitude: 105.4478 },
  'Đắk Lắk': { latitude: 12.7124, longitude: 108.257 },
  'Đắk Nông': { latitude: 12.1653, longitude: 107.6639 },
  'Lâm Đồng': { latitude: 11.9403, longitude: 108.448 },
};

export async function seedProvinceCityWard() {
  try {
    // Load data from JSON file
    const db = JSON.parse(fs.readFileSync('src/seeds/db.json', 'utf8'));

    // Seed provinces first
    for (const province of db.province) {
      const coordinates = provinceCoordinates[province.name] || {};

      const createdProvince = await prisma.province.create({
        data: {
          name: province.name,
          code: province.idProvince,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
      });

      // Find districts for this province
      const districts = db.district.filter((district: any) => district.idProvince == province.idProvince);

      // Seed districts for this province
      for (const district of districts) {
        const createdDistrict = await prisma.district.create({
          data: {
            name: district.name,
            provinceId: createdProvince.id,
            // Kinh độ vĩ độ của quận/huyện có thể để trống hoặc để mặc định
          },
        });

        // Find wards for this district
        const wards = db.commune.filter((ward: any) => ward.idDistrict == district.idDistrict);

        // Seed wards for this district
        for (const ward of wards) {
          await prisma.ward.create({
            data: {
              name: ward.name,
              districtId: createdDistrict.id,
              // Kinh độ vĩ độ của phường/xã có thể để trống
            },
          });
        }
      }
    }

    console.log('🎉 Done seeding provinces, districts, and wards!');
  } catch (error) {
    console.error('Error seeding province, district, and ward:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
