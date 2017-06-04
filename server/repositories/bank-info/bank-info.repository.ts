import {injectable} from "inversify"
import {Bank} from "./bank.enum"
import * as fs from 'fs-extra'
import {ConfigService} from "../../services/config/config.service";
import {Cookie} from "./bank-info";

@injectable()
export class BankInfoRepository {
    constructor(private configService: ConfigService){}

    async getBankInfo(user: string, bank: Bank){
        try {
            return await fs.readJSON(this.getFileName(user, bank), {throws: false})
        }catch(err){
            if(err.message.startsWith(`ENOENT: no such file or directory`)){
                throw new Error(`No bank info for user ${user} and bank ${bank} (${this.getFileName(user, bank)} missing)`)
            }else{
                throw err
            }
        }
    }

    async updateCookies(user: string, bank: Bank, cookies: Cookie[]){
        console.log(`Updating cookies for user: ${user} and bank ${bank}. Cookies: ${JSON.stringify(cookies)}`)
        let bankInfo = await this.getBankInfo(user, bank)
        bankInfo.cookies = cookies

        await fs.outputJSON(this.getFileName(user, bank), bankInfo)
    }

    private getFileName(user: string, bank: Bank) {
        return `${this.configService.config.dataDir}${user}_${bank}.json`;
    }
}