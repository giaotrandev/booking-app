import { Request, Response, NextFunction } from 'express';
import { prisma } from '#config/db';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError } from '#utils/apiResponse';

// Lấy danh sách tất cả các tỉnh
export const getAllProvinces = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const provinces = await prisma.province.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        latitude: true,
        longitude: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, 'geo.provincesRetrieved', { provinces }, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Lấy chi tiết một tỉnh theo ID hoặc mã
export const getProvinceDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { idOrCode } = req.params;

    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(idOrCode);

    const province = await prisma.province.findFirst({
      where: {
        OR: [...(isValidObjectId ? [{ id: idOrCode }] : []), { code: idOrCode }],
      },
      include: {
        districts: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            status: true,
          },
        },
      },
    });

    if (!province) {
      sendNotFound(res, 'geo.provinceNotFound', null, language);
      return;
    }

    sendSuccess(res, 'geo.provinceDetailsRetrieved', { province }, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Lấy danh sách quận/huyện của một tỉnh
export const getDistrictsByProvince = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { provinceIdOrCode } = req.params;

    // Tìm tỉnh trước
    const province = await prisma.province.findFirst({
      where: {
        OR: [{ id: provinceIdOrCode }, { code: provinceIdOrCode }],
      },
    });

    if (!province) {
      sendNotFound(res, 'geo.provinceNotFound', null, language);
      return;
    }

    // Lấy danh sách quận/huyện
    const districts = await prisma.district.findMany({
      where: {
        // Điều kiện này sẽ cần được điều chỉnh dựa trên mối quan hệ thực tế trong schema
        // provinceId: province.id
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        status: true,
        _count: {
          select: { wards: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    sendSuccess(
      res,
      'geo.districtsRetrieved',
      {
        province: {
          id: province.id,
          name: province.name,
          code: province.code,
        },
        districts,
      },
      language
    );
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Lấy chi tiết quận/huyện
export const getDistrictDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { districtIdOrCode } = req.params;

    const district = await prisma.district.findFirst({
      where: {
        OR: [
          { id: districtIdOrCode },
          // Thêm điều kiện tìm theo mã quận/huyện nếu có
        ],
      },
      include: {
        wards: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            status: true,
          },
        },
      },
    });

    if (!district) {
      sendNotFound(res, 'geo.districtNotFound', null, language);
      return;
    }

    sendSuccess(res, 'geo.districtDetailsRetrieved', { district }, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Lấy danh sách phường/xã của một quận/huyện
export const getWardsByDistrict = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { districtIdOrCode } = req.params;

    // Tìm quận/huyện trước
    const district = await prisma.district.findFirst({
      where: {
        OR: [
          { id: districtIdOrCode },
          // Thêm điều kiện tìm theo mã quận/huyện nếu có
        ],
      },
    });

    if (!district) {
      sendNotFound(res, 'geo.districtNotFound', null, language);
      return;
    }

    // Lấy danh sách phường/xã
    const wards = await prisma.ward.findMany({
      where: {
        districtId: district.id,
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });

    sendSuccess(
      res,
      'geo.wardsRetrieved',
      {
        district: {
          id: district.id,
          name: district.name,
        },
        wards,
      },
      language
    );
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Tìm kiếm địa điểm
export const searchLocations = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      sendBadRequest(res, 'geo.searchQueryTooShort', null, language);
      return;
    }

    // Tìm kiếm trên các bảng Province, District, Ward
    const results = await prisma.$transaction([
      prisma.province.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          status: true,
        },
        take: 5,
      }),
      prisma.district.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          status: true,
        },
        take: 5,
      }),
      prisma.ward.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          status: true,
        },
        take: 5,
      }),
    ]);

    // Flatten and combine results
    const combinedResults = [
      ...results[0].map((p) => ({ ...p, type: 'PROVINCE' })),
      ...results[1].map((d) => ({ ...d, type: 'DISTRICT' })),
      ...results[2].map((w) => ({ ...w, type: 'WARD' })),
    ];

    sendSuccess(res, 'geo.searchResultsRetrieved', { results: combinedResults }, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};
