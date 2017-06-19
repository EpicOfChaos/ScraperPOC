const delay = require('timeout-as-promise')
import * as _ from 'lodash'
import * as fs from 'fs-extra'

export class Chrome {
    public static DELETE_KEY = 46
    public static TAB_KEY = 9

    private _Page: any
    private _Runtime: any
    private _Input: any
    private _Network: any
    private _Target: any

    constructor(private targetId: string,
                private client: any,
                private CDP: any,
                private dataDir: string,
                private headless: boolean) {
        let {Page, Runtime, Input, Network, Target} = client
        this._Page = Page
        this._Runtime = Runtime
        this._Input = Input
        this._Network = Network
        this._Target = Target
    }

    get Page() {
        return this._Page
    }

    get Runtime() {
        return this._Runtime
    }

    get Input() {
        return this._Input
    }

    get Network() {
        return this._Network
    }

    get Target() {
        return this._Target
    }

    get target() {
        return this.targetId
    }

    async attach(){
        await this._Target.attachToTarget({
            targetId: this.targetId
        })
    }

    async detach(){
        console.log('Detaching fromm target: ' + this.targetId)
        // await this._Target.detachFromTarget({
        //     targetId: this.targetId
        // })
        this.client.close()
    }

    async clearCookies(){
        return await this.Network.clearBrowserCookies()
    }

    async getCookies(){
        let cookiesResponse = await this.Network.getCookies()
        return cookiesResponse.cookies
    }

    async setCookies(url: string, cookies: any[]) {
        for(let cookie of cookies){
            let result = await this.Network.setCookie({
                url: url,
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly
            })

        }
    }

    async count(selector:string) {
        return this.executeJQuery(`$('${selector}').length`)
    }

    async executeJQuery(jqueryStatement: string){
        let evalResult = await this._Runtime.evaluate({expression: jqueryStatement, returnByValue: true})
        return evalResult.result.value
    }

    async pageLoaded(){
        return new Promise((resolve, reject) => {
            this._Page.loadEventFired(() => {
                return resolve()
            })
        })
    }

    async type(selector:string, value: string){
        await this.executeJQuery(`$('${selector}').focus()`)
        let letters = value.split('')
        for(let letter of letters){
            await this._Input.dispatchKeyEvent({
                type: 'keyDown',
                text: letter
            })
            await this._Input.dispatchKeyEvent({
                type: 'keyUp',
                text: letter
            })
        }
        return await this.executeJQuery(`$('${selector}')[0].value`)
    }

    async typeKeyCode(selector:string, keyCode: number, numberOfTimes: number = 1){
        await this.executeJQuery(`$('${selector}').focus()`)
        for(let i = 0; i < numberOfTimes; i++){
            await this._Input.dispatchKeyEvent({
                type: 'keyDown',
                windowsVirtualKeyCode: keyCode
            })
            await this._Input.dispatchKeyEvent({
                type: 'keyUp',
                windowsVirtualKeyCode: keyCode
            })
        }
        return await this.executeJQuery(`$('${selector}')[0].value`)
    }

    async click(selector: string, offset:number = 0){
        let button = await this.executeJQuery(`$('${selector}').offset()`)
        let x = Math.ceil(button.left)
        let y = Math.ceil(button.top)

        let clickEvent:any = {
            x: x + offset,
            y: y + offset,
            button: 'left',
            clickCount: 1
        }

        let mouseDownEvent = _.clone(clickEvent)
        mouseDownEvent.type = 'mousePressed'

        let mouseUpEvent = _.clone(clickEvent)
        mouseUpEvent.type = 'mouseReleased'

        await this._Input.dispatchMouseEvent(mouseDownEvent)
        await this._Input.dispatchMouseEvent(mouseUpEvent)
    }

    async innerText(selector: string){
        return await this.executeJQuery(`$('${selector}')[0].innerText`)
    }

    async waitForOneElement(selectors:string[], maxWait:number= 5000, interval: number = 200){
        let waitDuration = 0
        do {
            for(let selector of selectors){
                let response = await this.executeJQuery(`$('${selector}').length`)
                if(response > 0){
                    return selector
                }
            }

            await delay(interval)
            waitDuration += interval
        } while(waitDuration < maxWait)
        console.log('Timeout waiting for elements: ' + selectors)

        throw new Error('Timeout waiting for elements: ' + selectors)
    }

    async waitForElement(selector: string, maxWait:number = 20000, interval: number = 100){
        let waitDuration = 0
        do {
            let response = await this.executeJQuery(`$('${selector}').length`)
            if(response > 0){
                return
            }

            await delay(interval)
            waitDuration += interval
        } while(waitDuration < maxWait)
        console.log('Timeout waiting for element: ' + selector)

        throw new Error('Timeout waiting for element: ' + selector)
    }

    async getElementValue(selector: string){
        return await this.executeJQuery(`$('${selector}')[0].value`)
    }

    async delay(interval: number){
        await delay(interval)
    }

    async close(){
        await this.CDP.Close({id: this.targetId})
    }

    async saveScreenshot(){
        if(!this.headless){
            console.log('Cannot make PDF, not in headless mode.')
            return
        }
        let pdfResponse = await this.Page.printToPDF()
        let pdfFileName = `${this.dataDir}timeout_${(new Date).getTime()}.pdf`
        await fs.writeFile(pdfFileName, pdfResponse.data, {
            encoding: 'base64'
        })
        console.log(`Saved timeout screenshot to: ${pdfFileName}`)
    }

    async saveContent() {

    }
}