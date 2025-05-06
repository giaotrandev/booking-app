import { prisma } from '#src/config/db';
import { CommonStatus } from '@prisma/client';

export const seedBusStops = async () => {
  console.log('🌱 Seeding bus stops...');

  const busStops = await Promise.all([
    // HCMC Bus Stops
    prisma.busStop.create({
      // where: { id: createObjectId('mien_dong_bus_station') },
      // update: {},
      data: {
        // id: createObjectId('mien_dong_bus_station'),
        name: 'Bến xe Miền Đông',
        wardId: '6818841dfbd55f42fbd9a779',
        latitude: 10.8141,
        longitude: 106.713,
        status: CommonStatus.ACTIVE,
      },
    }),
    prisma.busStop.create({
      // where: { id: createObjectId('mien_tay_bus_station') },
      // update: {},
      data: {
        // id: createObjectId('mien_tay_bus_station'),
        name: 'Bến xe Miền Tây',
        wardId: '68188434fbd55f42fbd9a827',
        latitude: 10.7411,
        longitude: 106.6281,
        status: CommonStatus.ACTIVE,
      },
    }),
    prisma.busStop.create({
      // where: { id: createObjectId('an_suong_bus_station') },
      // update: {},
      data: {
        // id: createObjectId('an_suong_bus_station'),
        name: 'Bến xe An Sương',
        wardId: '6818843cfbd55f42fbd9a856',
        latitude: 10.8653,
        longitude: 106.6261,
        status: CommonStatus.ACTIVE,
      },
    }),

    // Hanoi Bus Stops
    prisma.busStop.create({
      // where: { id: createObjectId('giap_bat_bus_station') },
      // update: {},
      data: {
        // id: createObjectId('giap_bat_bus_station'),
        name: 'Bến xe Giáp Bát',
        wardId: '681883ccfbd55f42fbd9a58f',
        latitude: 20.9805,
        longitude: 105.8412,
        status: CommonStatus.ACTIVE,
      },
    }),
    prisma.busStop.create({
      // where: { id: createObjectId('my_dinh_bus_station') },
      // update: {},
      data: {
        // id: createObjectId('my_dinh_bus_station'),
        name: 'Bến xe Mỹ Đình',
        wardId: '681883dffbd55f42fbd9a5ea',
        latitude: 21.0287,
        longitude: 105.7828,
        status: CommonStatus.ACTIVE,
      },
    }),

    // Da Nang Bus Stops
    prisma.busStop.create({
      // where: { id: createObjectId('da_nang_central_station') },
      // update: {},
      data: {
        // id: createObjectId('da_nang_central_station'),
        name: 'Bến xe Trung tâm Đà Nẵng',
        wardId: '68188466fbd55f42fbd9a935',
        latitude: 16.0471,
        longitude: 108.222,
        status: CommonStatus.ACTIVE,
      },
    }),

    // An Giang Bus Stops
    prisma.busStop.create({
      // where: { id: createObjectId('long_xuyen_bus_station') },
      // update: {},
      data: {
        // id: createObjectId('long_xuyen_bus_station'),
        name: 'Bến xe Long Xuyên',
        wardId: '68188b36fbd55f42fbd9cc8d',
        latitude: 10.3781,
        longitude: 105.4382,
        status: CommonStatus.ACTIVE,
      },
    }),
    prisma.busStop.create({
      // where: { id: createObjectId('chau_doc_bus_station') },
      // update: {},
      data: {
        // id: createObjectId('chau_doc_bus_station'),
        name: 'Bến xe Châu Đốc',
        wardId: '68188b38fbd55f42fbd9cc96',
        latitude: 10.7087,
        longitude: 105.1265,
        status: CommonStatus.ACTIVE,
      },
    }),

    // Can Tho Bus Stops
    prisma.busStop.create({
      //     where: { id: createObjectId('can_tho_bus_station') },
      // update: {},
      data: {
        // id: createObjectId('can_tho_bus_station'),
        name: 'Bến xe Trung tâm Cần Thơ',
        wardId: '68188470fbd55f42fbd9a968',
        latitude: 10.025,
        longitude: 105.768,
        status: CommonStatus.ACTIVE,
      },
    }),
    prisma.busStop.create({
      // where: { id: 'cai_rang_bus_stop' },
      // update: {},
      data: {
        // id: 'cai_rang_bus_stop',
        name: 'Bến xe Cái Răng',
        wardId: '68188474fbd55f42fbd9a982',
        latitude: 10.0101,
        longitude: 105.764,
        status: CommonStatus.ACTIVE,
      },
    }),
  ]);

  console.log(`✅ Successfully seeded ${busStops.length} bus stops`);
  return busStops;
};

export default seedBusStops;
