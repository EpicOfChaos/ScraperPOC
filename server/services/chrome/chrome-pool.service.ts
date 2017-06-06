import {injectable} from 'inversify'
import {Chrome} from './chrome'
import {ConfigService} from '../config/config.service'
const CDP = require('chrome-remote-interface')

@injectable()
export class ChromePoolService {
    constructor(private configService: ConfigService) {
    }

    /*
     in the future this could use the CDP.List to determine if it should give out another
     instance based on how many are still open. Also many this should explore browser context?
     */

    async getExistingInstance(targetId: string){
        let targets = await CDP.List()
        let target = targets.filter((target: any) => {
            return target.id === targetId
        })[0]

        if(!target){
            throw new Error('Invalid targetId: ' + targetId)
        }

        let client = await CDP({
            target: target
        })

        await client.Target.activateTarget({targetId: targetId})

        await client.Page.enable()
        await client.Runtime.enable()
        await client.Network.enable()

        return new Chrome(target.id, client, CDP, this.configService.config.dataDir, this.configService.config.chrome.headless)
    }

    async getChromeInstance(url: string,) {
        let client: any
        let target: any
        if (this.configService.config.chrome.headless) {
            let targetClient = await CDP({tab: 'ws://localhost:9222/devtools/browser'})
            let {Target} = targetClient
            let browserContextResponse = await Target.createBrowserContext({})
            console.log('Created Browser Context' + JSON.stringify(browserContextResponse))
            let targetResponse = await Target.createTarget({
                url: url,
                width: 1280,
                height: 1096,
                browserContextId: browserContextResponse.browserContextId
            })
            console.log('Created Target Response' + JSON.stringify(targetResponse))

            let targets = await CDP.List()
            target = targets.filter((target: any) => {
                return target.id === targetResponse.targetId
            })[0]
        } else {
            target = await CDP.New({
                url: url
            })
        }

        client = await CDP({
            target: target
        })

        await client.Page.enable()
        await client.Runtime.enable()
        await client.Network.enable()

        console.log('Page Enabled')
        return new Chrome(target.id, client, CDP, this.configService.config.dataDir, this.configService.config.chrome.headless)
    }
}