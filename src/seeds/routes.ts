import { prisma } from '#src/config/db';
import { CommonStatus, DistanceUnit } from '@prisma/client';

export const seedRoutes = async () => {
  console.log('🌱 Seeding routes...');

  // Province IDs
  const canThoId = '68188470fbd55f42fbd9a967';
  const hanoiId = '681883bbfbd55f42fbd9a521';
  const hcmcId = '68188414fbd55f42fbd9a750';
  const anGiangId = '68188b31fbd55f42fbd9cc85';
  const daNangId = '68188465fbd55f42fbd9a92f';

  // Create routes
  const routes = await Promise.all([
    // Route 1: HCMC to Hanoi
    prisma.route.create({
      data: {
        code: 'SGN-HAN',
        name: 'TP.HCM - Hà Nội',
        direction: 'North',
        sourceProvinceId: hcmcId,
        destinationProvinceId: hanoiId,
        distance: 1710,
        distanceUnit: DistanceUnit.KM,
        estimatedDuration: 40 * 60, // 40 hours in minutes
        status: CommonStatus.ACTIVE,
      },
    }),

    // Route 2: Hanoi to HCMC
    prisma.route.create({
      data: {
        code: 'HAN-SGN',
        name: 'Hà Nội - TP.HCM',
        direction: 'South',
        sourceProvinceId: hanoiId,
        destinationProvinceId: hcmcId,
        distance: 1710,
        distanceUnit: DistanceUnit.KM,
        estimatedDuration: 40 * 60, // 40 hours in minutes
        status: CommonStatus.ACTIVE,
      },
    }),

    // Route 3: HCMC to Da Nang
    prisma.route.create({
      data: {
        code: 'SGN-DAD',
        name: 'TP.HCM - Đà Nẵng',
        direction: 'Central',
        sourceProvinceId: hcmcId,
        destinationProvinceId: daNangId,
        distance: 850,
        distanceUnit: DistanceUnit.KM,
        estimatedDuration: 16 * 60, // 16 hours in minutes
        status: CommonStatus.ACTIVE,
      },
    }),

    // Route 4: Da Nang to HCMC
    prisma.route.create({
      data: {
        code: 'DAD-SGN',
        name: 'Đà Nẵng - TP.HCM',
        direction: 'South',
        sourceProvinceId: daNangId,
        destinationProvinceId: hcmcId,
        distance: 850,
        distanceUnit: DistanceUnit.KM,
        estimatedDuration: 16 * 60, // 16 hours in minutes
        status: CommonStatus.ACTIVE,
      },
    }),

    // Route 5: HCMC to Can Tho
    prisma.route.create({
      data: {
        code: 'SGN-VCA',
        name: 'TP.HCM - Cần Thơ',
        direction: 'Southwest',
        sourceProvinceId: hcmcId,
        destinationProvinceId: canThoId,
        distance: 170,
        distanceUnit: DistanceUnit.KM,
        estimatedDuration: 3 * 60 + 30, // 3.5 hours in minutes
        status: CommonStatus.ACTIVE,
      },
    }),

    // Route 6: Can Tho to HCMC
    prisma.route.create({
      data: {
        code: 'VCA-SGN',
        name: 'Cần Thơ - TP.HCM',
        direction: 'Northeast',
        sourceProvinceId: canThoId,
        destinationProvinceId: hcmcId,
        distance: 170,
        distanceUnit: DistanceUnit.KM,
        estimatedDuration: 3 * 60 + 30, // 3.5 hours in minutes
        status: CommonStatus.ACTIVE,
      },
    }),

    // Route 7: HCMC to An Giang
    prisma.route.create({
      data: {
        code: 'SGN-AG',
        name: 'TP.HCM - An Giang',
        direction: 'West',
        sourceProvinceId: hcmcId,
        destinationProvinceId: anGiangId,
        distance: 230,
        distanceUnit: DistanceUnit.KM,
        estimatedDuration: 5 * 60, // 5 hours in minutes
        status: CommonStatus.ACTIVE,
      },
    }),

    // Route 8: An Giang to HCMC
    prisma.route.create({
      data: {
        code: 'AG-SGN',
        name: 'An Giang - TP.HCM',
        direction: 'East',
        sourceProvinceId: anGiangId,
        destinationProvinceId: hcmcId,
        distance: 230,
        distanceUnit: DistanceUnit.KM,
        estimatedDuration: 5 * 60, // 5 hours in minutes
        status: CommonStatus.ACTIVE,
      },
    }),

    // Route 9: Can Tho to An Giang
    prisma.route.create({
      data: {
        code: 'VCA-AG',
        name: 'Cần Thơ - An Giang',
        direction: 'Northwest',
        sourceProvinceId: canThoId,
        destinationProvinceId: anGiangId,
        distance: 70,
        distanceUnit: DistanceUnit.KM,
        estimatedDuration: 1 * 60 + 30, // 1.5 hours in minutes
        status: CommonStatus.ACTIVE,
      },
    }),

    // Route 10: An Giang to Can Tho
    prisma.route.create({
      data: {
        code: 'AG-VCA',
        name: 'An Giang - Cần Thơ',
        direction: 'Southeast',
        sourceProvinceId: anGiangId,
        destinationProvinceId: canThoId,
        distance: 70,
        distanceUnit: DistanceUnit.KM,
        estimatedDuration: 1 * 60 + 30, // 1.5 hours in minutes
        status: CommonStatus.ACTIVE,
      },
    }),
  ]);

  console.log(`✅ Successfully seeded ${routes.length} routes`);
  return routes;
};

export const seedRouteStops = async () => {
  console.log('🌱 Seeding route stops...');

  // Fetch all routes and bus stops to create relationships
  const routes = await prisma.route.findMany();
  const busStops = await prisma.busStop.findMany();

  // Find bus stops by name
  const findBusStop = (name: string) => {
    return busStops.find((stop) => stop.name.includes(name));
  };

  // Get specific bus stops
  const mienDong = findBusStop('Miền Đông');
  const mienTay = findBusStop('Miền Tây');
  const anSuong = findBusStop('An Sương');
  const giapBat = findBusStop('Giáp Bát');
  const myDinh = findBusStop('Mỹ Đình');
  const daNang = findBusStop('Đà Nẵng');
  const longXuyen = findBusStop('Long Xuyên');
  const chauDoc = findBusStop('Châu Đốc');
  const canTho = findBusStop('Trung tâm Cần Thơ');
  const caiRang = findBusStop('Cái Răng');

  // Find routes by code
  const findRoute = (code: string) => {
    return routes.find((route) => route.code === code);
  };

  // Create route stops for each route
  const routeStops = [];

  // Helper function to create route stops
  const createRouteStops = async (routeCode: any, busStopsList: any) => {
    const route = findRoute(routeCode);
    if (!route) {
      console.error(`Route with code ${routeCode} not found`);
      return [];
    }

    const stops = [];
    for (let i = 0; i < busStopsList.length; i++) {
      const busStop = busStopsList[i];
      if (!busStop) {
        console.error(`Bus stop at index ${i} not found for route ${routeCode}`);
        continue;
      }

      // Calculate estimated times (simplified for seeding)
      const departureTime = new Date();
      departureTime.setHours(8 + i, 0, 0); // Starts at 8:00 AM, each stop adds an hour

      const arrivalTime = new Date(departureTime);
      arrivalTime.setMinutes(arrivalTime.getMinutes() - 10); // Arrive 10 minutes before departure

      const stop = await prisma.routeStop.create({
        data: {
          routeId: route.id,
          busStopId: busStop.id,
          stopOrder: i + 1,
          estimatedArrivalTime: arrivalTime,
          estimatedDepartureTime: departureTime,
          status: CommonStatus.ACTIVE,
        },
      });

      stops.push(stop);
    }

    return stops;
  };

  // Create route stops for HCMC to Hanoi
  const sgnHanStops = await createRouteStops('SGN-HAN', [mienDong, daNang, giapBat]);
  routeStops.push(...sgnHanStops);

  // Create route stops for Hanoi to HCMC
  const hanSgnStops = await createRouteStops('HAN-SGN', [myDinh, daNang, mienDong]);
  routeStops.push(...hanSgnStops);

  // Create route stops for HCMC to Da Nang
  const sgnDadStops = await createRouteStops('SGN-DAD', [mienDong, daNang]);
  routeStops.push(...sgnDadStops);

  // Create route stops for Da Nang to HCMC
  const dadSgnStops = await createRouteStops('DAD-SGN', [daNang, mienDong]);
  routeStops.push(...dadSgnStops);

  // Create route stops for HCMC to Can Tho
  const sgnVcaStops = await createRouteStops('SGN-VCA', [mienTay, canTho]);
  routeStops.push(...sgnVcaStops);

  // Create route stops for Can Tho to HCMC
  const vcaSgnStops = await createRouteStops('VCA-SGN', [canTho, mienTay]);
  routeStops.push(...vcaSgnStops);

  // Create route stops for HCMC to An Giang
  const sgnAgStops = await createRouteStops('SGN-AG', [mienTay, longXuyen, chauDoc]);
  routeStops.push(...sgnAgStops);

  // Create route stops for An Giang to HCMC
  const agSgnStops = await createRouteStops('AG-SGN', [chauDoc, longXuyen, mienTay]);
  routeStops.push(...agSgnStops);

  // Create route stops for Can Tho to An Giang
  const vcaAgStops = await createRouteStops('VCA-AG', [canTho, caiRang, longXuyen]);
  routeStops.push(...vcaAgStops);

  // Create route stops for An Giang to Can Tho
  const agVcaStops = await createRouteStops('AG-VCA', [longXuyen, caiRang, canTho]);
  routeStops.push(...agVcaStops);

  console.log(`✅ Successfully seeded ${routeStops.length} route stops`);
  return routeStops;
};

export const seedRoutesAndRouteStops = async () => {
  const routes = await seedRoutes();
  const routeStops = await seedRouteStops();

  return {
    routes,
    routeStops,
  };
};

export default seedRoutesAndRouteStops;
