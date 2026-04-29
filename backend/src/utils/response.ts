// src/utils/response.ts

/**
 * Creates a standardized success response object
 * @param message - Success message
 * @param data - Optional payload data
 * @returns Success response
 */
export const createSuccessResponse = (message: string, data?: any) => {
  return {
    success: true,
    message,
    data: data || null,
  };
};

/**
 * Creates a standardized error response object
 * @param message - Error message
 * @param errors - Optional detailed errors array
 * @returns Error response
 */
export const createErrorResponse = (message: string, errors?: any[]) => {
  return {
    success: false,
    message,
    errors: errors || null,
  };
};
