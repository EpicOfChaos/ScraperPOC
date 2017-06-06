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

    async process(bankInfo: BankInfo): Promise<ScrapResponse> {
        let chromeInstance = await this.chromePoolService.getChromeInstance('https://online.gwcu.org/User/AccessSignin/Start')
        await chromeInstance.attach()
        try {
            console.log('Have chrome instance')
            await chromeInstance.waitForElement('#UsernameField', 10000)
            await chromeInstance.clearCookies()
            console.log('Cleared cookies')
            await chromeInstance.setCookies('https://online.gwcu.org', bankInfo.cookies)
            console.log('Restored cookies')

            await this.logIn(chromeInstance, bankInfo)

            let path = await chromeInstance.waitForOneElement([this.MFA_PATH, this.MFA_COMPLETE_PATH])
            if(path === this.MFA_PATH){
                let mfaQuestion = await chromeInstance.innerText('#AccessForm[action="/User/AccessSignin/Challenge"] div table tbody tr[class="Field"]:first')
                console.log('pre detach')
                // await chromeInstance.detach()
                console.log('post detach')
                return {
                    status: ScraperResponseStatus.MFA,
                    mfaQuestion: mfaQuestion,
                    targetId: chromeInstance.target
                }
            }else{
                await this.downloadQFX(chromeInstance)
                let validCookies = await this.getValidCookies(chromeInstance)
                await chromeInstance.close()
                return {
                    status: ScraperResponseStatus.Complete,
                    cookies: validCookies
                }
            }
        } catch(err){
            // await chromeInstance.saveScreenshot()
            await chromeInstance.close()
            return {
                status: ScraperResponseStatus.Error,
                error: err.message
            }
        }
    }

    private async getValidCookies(chromeInstance: Chrome) {
        let cookies = await chromeInstance.getCookies()
        let validCookies: Cookie[] = cookies.filter((cookie: Cookie) => {
            return cookie.name !== 'Jwaala.Site.User'
        })
        return validCookies
    }

    async processMFA(bankInfo: BankInfo, targetId:string, answer: string){
        let chromeInstance = await this.chromePoolService.getExistingInstance(targetId)
        try{

            let validCookies = await this.getValidCookies(chromeInstance)
            // await chromeInstance.close()
            return {
                status: ScraperResponseStatus.Complete,
                cookies: validCookies
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

    private async logIn(chromeInstance: Chrome, bankInfo: BankInfo) {
        await chromeInstance.type('#UsernameField', bankInfo.username)
        await chromeInstance.click('#SubmitNext', 5)
        console.log('Submitted username to GWCU')

        await chromeInstance.waitForElement('#PasswordField', 20000)
        await chromeInstance.type('#PasswordField', bankInfo.password)
        await chromeInstance.click('#SubmitNext', 5)
        console.log('Submitted password to GWCU')
    }

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
        console.log('Successfully downloaded transactions.')
    }
}