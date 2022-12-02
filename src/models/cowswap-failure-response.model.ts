export interface CowSwapFailureResponseModel {
  errorType: string;
  description: string;
  data: {
    fee_amount: string;
  };
}
