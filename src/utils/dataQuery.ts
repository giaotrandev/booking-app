import { Prisma } from '@prisma/client';

export interface DataQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  searchFields?: string[];
  filters?: Record<string, any>;
  sort?: Array<{ field: string; order: 'asc' | 'desc' }>;
  returnAll?: boolean;
  relations?: string[]; // Hỗ trợ include/join
  enumFields?: Record<string, any[]>;
}

// Hàm hỗ trợ tạo nested include
function createNestedInclude(relations: string[]): Record<string, any> {
  const include: Record<string, any> = {};

  relations.forEach((relation) => {
    // Tách nested relations
    const parts = relation.split('.');

    // Nếu là relation đơn giản
    if (parts.length === 1) {
      include[parts[0]] = true;
      return;
    }

    // Xử lý nested relations
    let currentLevel = include;
    parts.forEach((part, index) => {
      // Nếu là phần tử cuối
      if (index === parts.length - 1) {
        currentLevel[part] = true;
      } else {
        // Tạo object nested nếu chưa tồn tại
        if (!currentLevel[part]) {
          currentLevel[part] = { include: {} };
          currentLevel = currentLevel[part].include;
        } else if (!currentLevel[part].include) {
          currentLevel[part].include = {};
          currentLevel = currentLevel[part].include;
        } else {
          currentLevel = currentLevel[part].include;
        }
      }
    });
  });

  return include;
}

// (Giữ nguyên các hàm khác như buildSearchCondition, buildFilterCondition, buildSortCondition)
function buildSearchCondition(searchTerm: string, searchFields: string[]): Prisma.JsonObject {
  if (!searchTerm || searchFields.length === 0) return {};

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const searchConditions = searchFields.map((field) => ({
    [field]: {
      contains: normalizedSearch,
      mode: 'insensitive' as Prisma.QueryMode,
    },
  }));

  return { OR: searchConditions };
}

function buildFilterCondition(filters?: Record<string, any>, enumFields?: Record<string, any[]>): Prisma.JsonObject {
  if (!filters || Object.keys(filters).length === 0) return {};

  const processedFilters = { ...filters };

  if (enumFields) {
    Object.keys(processedFilters).forEach((field) => {
      if (enumFields[field]) {
        const value = processedFilters[field];

        if (typeof value !== 'object' || value === null) {
          const isValidEnumValue =
            typeof value === 'string' &&
            enumFields[field].some((enumValue: any) => {
              return enumValue === value || (typeof enumValue === 'string' && enumValue.toString() === value);
            });

          if (isValidEnumValue) {
            processedFilters[field] = value;
          } else {
            console.warn(`Invalid enum value for ${field}: ${value}. Valid values are: ${enumFields[field]}`);
            delete processedFilters[field];
          }
        }
      } else if (typeof processedFilters[field] !== 'object' || processedFilters[field] === null) {
        processedFilters[field] = { equals: processedFilters[field] };
      }
    });
  } else {
    Object.keys(processedFilters).forEach((field) => {
      const value = processedFilters[field];
      if (typeof value !== 'object' || value === null) {
        processedFilters[field] = { equals: value };
      }
    });
  }

  return processedFilters;
}

function buildSortCondition(sort?: Array<{ field: string; order: 'asc' | 'desc' }>) {
  if (!sort || sort.length === 0) return undefined;

  return sort.map(({ field, order }) => ({ [field]: order }));
}

export async function queryData<T>(
  prismaModel: any,
  params: DataQueryParams = {},
  options: {
    select?: Prisma.JsonObject;
    include?: Prisma.JsonObject;
    distinct?: string[];
  } = {}
) {
  // Thiết lập giá trị mặc định
  const page = params.returnAll ? 1 : parseInt(process.env.PAGINATION_DEFAULT_PAGE as string) || 1;
  const pageSize = params.returnAll ? undefined : parseInt(process.env.PAGINATION_DEFAULT_LIMIT as string) || 10;
  const skip = params.returnAll ? undefined : (page - 1) * (pageSize || 10);

  // Xây dựng điều kiện tìm kiếm
  const searchCondition =
    params.search && params.searchFields && params.searchFields.length > 0
      ? buildSearchCondition(params.search, params.searchFields)
      : {};

  // Xây dựng điều kiện lọc
  const filterCondition = params.filters ? buildFilterCondition(params.filters, params.enumFields) : {};

  // Kết hợp các điều kiện
  const whereCondition = {
    ...(Object.keys(searchCondition).length > 0 ? searchCondition : {}),
    ...filterCondition,
  };

  // Xây dựng điều kiện sắp xếp
  const orderBy = buildSortCondition(params.sort);

  // Xử lý select và include
  const selectOrInclude: { select?: any; include?: any } = {};

  // Nếu có options.select, sử dụng select
  if (options.select) {
    selectOrInclude.select = options.select;
  }
  // Nếu không, xử lý include từ relations
  else if (params.relations && params.relations.length > 0) {
    selectOrInclude.include = createNestedInclude(params.relations);
  }

  // Thực hiện truy vấn
  const [totalCount, data] = await Promise.all([
    prismaModel.count({ where: whereCondition }),
    prismaModel.findMany({
      where: whereCondition,
      skip,
      take: pageSize,
      orderBy,
      ...selectOrInclude,
      distinct: options.distinct,
    }),
  ]);

  // Tính toán phân trang
  const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

  return {
    data,
    meta: {
      page,
      pageSize: pageSize || totalCount,
      totalCount,
      totalPages,
      hasNextPage: pageSize ? page < totalPages : false,
      hasPrevPage: pageSize ? page > 1 : false,
    },
  };
}
