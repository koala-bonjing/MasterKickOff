import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, any>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    suggestion?: string;
    details?: any;
  };
}

export function handleApiSuccess<T>(data: T, meta?: Record<string, any>, status: number = 200) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      success: true,
      data,
      meta,
    },
    { status }
  );
}

export function handleApiError(error: any, fallbackMessage: string = 'An unexpected error occurred') {
  console.error('API Error Handler Caught:', error);

  const errorMessage = error?.message || fallbackMessage;
  const isConnectionError =
    errorMessage.includes('Connection acquisition timed out') ||
    errorMessage.includes('Failed to connect to any of the provided addresses') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('ETIMEDOUT') ||
    error?.code === 'ServiceUnavailable' ||
    error?.code === 'SessionExpired';

  if (isConnectionError) {
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code: 'DATABASE_UNREACHABLE',
          message: 'Unable to reach the CognoDB / Neo4j graph database.',
          suggestion: 'Please verify your NEO4J_URI or COGNODB_URI credentials in .env.local and check that the cloud instance is active.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
      },
      { status: 503 }
    );
  }

  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error: {
        code: error?.code || 'INTERNAL_ERROR',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
    },
    { status: 500 }
  );
}
