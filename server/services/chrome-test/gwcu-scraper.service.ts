import {injectable} from 'inversify'
import {ChromePoolService} from '../chrome/chrome-pool.service'
import {BankInfo, Cookie} from '../../repositories/bank-info/bank-info'
import {Chrome} from '../chrome/chrome'
import {ScrapResponse} from '../scraper/scraper-response'
import {ScraperResponseStatus} from '../scraper/scraper-response'

@injectable()
export class GWCUScraperService {
    private MFA_PATH = '#AccessForm[action="/User/AccessSignin/Challenge"]'
    private MFA_COMPLETE_PATH = 'span[name="OptionMenu"]'

    constructor(private chromePoolService: ChromePoolService) {
    }

    //Standard processing for non MFA
    async process(bankInfo: BankInfo): Promise<ScrapResponse> {
        let chromeInstance = await this.chromePoolService.getChromeInstance('https://online.gwcu.org/User/AccessSignin/Start')

        try {
            console.log(await chromeInstance.attach())
            console.log(`Processing GWCU - ${bankInfo.username}`)
            await chromeInstance.waitForElement('#UsernameField', 10000)
            await chromeInstance.setCookies('https://online.gwcu.org', bankInfo.cookies)

            await this.logIn(chromeInstance, bankInfo)

            let path = await chromeInstance.waitForOneElement([this.MFA_PATH, this.MFA_COMPLETE_PATH], 20000)
            if(path === this.MFA_PATH){
                let mfaQuestion = await chromeInstance.innerText('#AccessForm[action="/User/AccessSignin/Challenge"] div table tbody tr[class="Field"]:first')
                await chromeInstance.detach()
                return {
                    status: ScraperResponseStatus.MFA,
                    mfaQuestion: mfaQuestion,
                    targetId: chromeInstance.target
                }
            }else{
                return this.postLogin(chromeInstance)
            }
        } catch(err){
            await chromeInstance.saveScreenshot()
            await chromeInstance.close()
            return {
                status: ScraperResponseStatus.Error,
                error: err.message
            }
        }
    }

    //Process MFA response
    async processMFA(bankInfo: BankInfo, targetId:string, answer: string){
        let chromeInstance = await this.chromePoolService.getExistingInstance(targetId)
        try{
            await chromeInstance.waitForElement('#Answer')
            await chromeInstance.type('#Answer', answer)
            await chromeInstance.click('#Remember[value="True"]', 2)
            await chromeInstance.click('#SubmitNext', 5)

            return await this.postLogin(chromeInstance)
        } catch(err){
            await chromeInstance.saveScreenshot()
            await chromeInstance.close()
            return {
                status: ScraperResponseStatus.Error,
                error: err.message
            }
        }
    }

    //Standard Login
    private async logIn(chromeInstance: Chrome, bankInfo: BankInfo) {
        await chromeInstance.type('#UsernameField', bankInfo.username)
        await chromeInstance.click('#SubmitNext', 5)

        await chromeInstance.waitForElement('#PasswordField', 20000)
        await chromeInstance.type('#PasswordField', bankInfo.password)
        await chromeInstance.click('#SubmitNext', 5)
        console.log(`Login submitted for GWCU - ${bankInfo.username}`)
    }

    //After successful login, scrap deposits and download QFX
    private async postLogin(chromeInstance: Chrome){
        let totalDeposits = await this.getTotalDeposits(chromeInstance)
        await this.downloadQFX(chromeInstance)
        let validCookies = await this.getValidCookies(chromeInstance)
        await chromeInstance.close()
        return {
            status: ScraperResponseStatus.Complete,
            totalBalance: totalDeposits,
            cookies: validCookies
        }
    }

    //Scrap deposits off account summary
    private async getTotalDeposits(chromeInstance: Chrome){
        await chromeInstance.waitForElement('.gwcu-amount')
        return await chromeInstance.innerText('.gwcu-amount')
    }

    //Download QFX
    private async downloadQFX(chromeInstance: Chrome) {
        await chromeInstance.waitForElement('span[name="OptionMenu"]', 30000)
        await chromeInstance.click('span[name="OptionMenu"]', 3)
        await chromeInstance.click('a:contains("Download to Quicken - QFX")', 3)
        console.log('Navigated to Quicken export.')

        await chromeInstance.waitForElement('#String0Field')
        await chromeInstance.typeKeyCode('#String0Field', Chrome.DELETE_KEY, 10)
        await chromeInstance.type('#String0Field', '05/01/2017')
        await chromeInstance.typeKeyCode('#String1Field', Chrome.DELETE_KEY, 10)
        await chromeInstance.type('#String1Field', '05/15/2017')
        await chromeInstance.typeKeyCode('#String1Field', Chrome.TAB_KEY)
        await chromeInstance.delay(200)
        await chromeInstance.click('#SubmitDownload', 3)
        await chromeInstance.delay(3000)
        console.log('Successfully downloaded transactions.')
    }

    //Retrieve only valid cookies for restore. Jwaala.Site.User causes subsequent logins to fail.
    private async getValidCookies(chromeInstance: Chrome) {
        let cookies = await chromeInstance.getCookies()
        let validCookies: Cookie[] = cookies.filter((cookie: Cookie) => {
            return cookie.name !== 'Jwaala.Site.User'
        })
        return validCookies
    }
}