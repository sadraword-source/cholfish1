import { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncFn<Req extends Request> = (req: Req, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * هندلرهای async اکسپرس خطاها را به‌صورت خودکار نمی‌گیرند؛
 * این wrapper خطای Promise را به errorHandler پاس می‌دهد.
 */
export function asyncHandler<Req extends Request = Request>(fn: AsyncFn<Req>): RequestHandler {
  return (req, res, next) => {
    fn(req as Req, res, next).catch(next);
  };
}
