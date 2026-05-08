import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';

function normalizePagedResponse(payload) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      page: 1,
      pageSize: payload.length,
      totalCount: payload.length,
      hasMore: false,
    };
  }

  return {
    items: payload.items ?? [],
    page: payload.page ?? 1,
    pageSize: payload.pageSize ?? 0,
    totalCount: payload.totalCount ?? 0,
    hasMore: payload.hasMore ?? false,
  };
}

async function fetchAllPages(fetchPage) {
  const firstPage = await fetchPage(1);
  let items = [...firstPage.items];
  let currentPage = firstPage.page;
  let hasMore = firstPage.hasMore;

  while (hasMore) {
    currentPage += 1;
    const nextPage = await fetchPage(currentPage);
    items = items.concat(nextPage.items);
    hasMore = nextPage.hasMore;
  }

  return items;
}

export const wallApi = {
  // Hämta vägg (posts från följda användare)
  async getWall() {
    return await fetchAllPages((page) => this.getWallPage(page, 10));
  },

  async getWallPage(page = 1, pageSize = 10) {
    const response = await authenticatedFetch(`${API_BASE_URL}/wall?page=${page}&pageSize=${pageSize}`);
    const payload = await handleApiResponse(response);
    return normalizePagedResponse(payload);
  },
};