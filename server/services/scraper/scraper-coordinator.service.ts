import {injectable} from 'inversify'
import {GoogleScraper2Service} from "../horseman/google/google-scraper-2.service";
import {BingScraperService} from '../horseman/bing/bing-scraper.service'
import {AskScraperService} from '../horseman/ask/ask-scraper.service'
import {ChromiumTest} from "../chrome-test/chromium-test";
import {GWCUScraperService} from "../chrome-test/gwcu-scraper.service";
import {Bank} from "../../repositories/bank-info/bank.enum";
import {BankInfoRepository} from "../../repositories/bank-info/bank-info.repository";
import {ScraperResponseStatus} from './scraper-response'
import {ProcessBankCompletePublisher} from '../../rabbit/process-bank-complete.publisher'

@injectable()
export class ScraperCoordinatorService {
    constructor(private googleScraper: GoogleScraper2Service,
                private bingScraper: BingScraperService,
                private askScraper: AskScraperService,
                private chromiumTest: ChromiumTest,
                private gwcuScraper: GWCUScraperService,
                private bankInfoRepo: BankInfoRepository,
                private processBankCompletePublisher: ProcessBankCompletePublisher
    ) {}

    async process(type: string) {
        if(type === 'GOOGLE'){
            return await this.googleScraper.navigate()
        }else if(type === 'BING') {
            return await this.bingScraper.navigate()
        }else if(type === 'ASK'){
            return await this.askScraper.navigate()
        }else if(type === 'TEST') {
            return await this.chromiumTest.test()
        }else {
            throw new Error(`Unknown type: ${type}`)
        }
    }

    async processBank(bank: Bank, user: string){
        let bankInfo = await this.bankInfoRepo.getBankInfo(user, bank)
        if(!bankInfo){
            throw new Error(`No bank info for user ${user} and bank ${bank}`)
        }

        let result =  await this.gwcuScraper.process(bankInfo)
        if(result.status === ScraperResponseStatus.Complete){
            await this.processBankCompletePublisher.publishMessage(result)
            await this.bankInfoRepo.updateCookies(user, bank, result.cookies)
        }

        return result
    }

    async processBankMFA(bank: Bank, user: string, targetId: string, answer: string){
        let bankInfo = await this.bankInfoRepo.getBankInfo(user, bank)
        if(!bankInfo){
            throw new Error(`No bank info for user ${user} and bank ${bank}`)
        }

        let result:any =  await this.gwcuScraper.processMFA(bankInfo, targetId, answer)
        if(result.status === ScraperResponseStatus.Complete && result.cookies){
            await this.processBankCompletePublisher.publishMessage(result)
            await this.bankInfoRepo.updateCookies(user, bank, result.cookies)
        }

        return result
    }


}