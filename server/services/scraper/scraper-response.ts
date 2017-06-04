import {Cookie} from '../../repositories/bank-info/bank-info'
export type ScraperResponseStatus = "Complete" | "MFA" | "Error";
export const ScraperResponseStatus = {
    Complete: "Complete" as ScraperResponseStatus,
    MFA: "MFA" as ScraperResponseStatus,
    Error: "Error" as ScraperResponseStatus,
}

export interface ScrapResponse {
    totalBalance?:number
    targetId?: string
    cookies?: Cookie[]
    mfaQuestion?: string
    error?: string
    status: ScraperResponseStatus
}