import express = require('express')
import cookieParser = require('cookie-parser')
import bodyParser = require('body-parser')
import {HttpError} from './errors/http-error'
import {rootRoutes} from './routes/index'
import {container} from './ioc'
import {ConfigService} from './services/config/config.service'
import {ProcessBankCompletePublisher} from './rabbit/process-bank-complete.publisher'
import {ProcessBankListener} from './rabbit/process-bank.listener'

const nodeCleanup = require('node-cleanup')
const {ChromeLauncher} = require('lighthouse/lighthouse-cli/chrome-launcher')
export const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser())

app.use('/', rootRoutes)

// catch 404 and forward to error handler
app.use(function (req: express.Request, res: express.Response, next: express.NextFunction) {
    let err = new HttpError('Not Found')
    err.status = 404
    next(err)
})

// error handler
app.use(function (err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
    // set locals, only providing error in development
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    // render the error page
    res.status(err.status || 500)
    res.send(err.message)
})

let configService = container.get<ConfigService>(ConfigService)
launchChrome(configService.config.chrome.headless).then((launcher: any) => {
    console.log('Launched chrome! Headless: ' + configService.config.chrome.headless)
})

let processBankCompletePublisher = container.get<ProcessBankCompletePublisher>(ProcessBankCompletePublisher)
processBankCompletePublisher.init()

let processBankListener = container.get<ProcessBankListener>(ProcessBankListener)
processBankListener.init()

nodeCleanup((exitCode: any, signal: any) => {
    if (signal) {
        process.kill(process.pid, signal)
        nodeCleanup.uninstall()
        return false
    }
})

function launchChrome(headless = true) {
    const launcher = new ChromeLauncher({
        port: 9222,
        autoSelectChrome: true, // False to manually select which Chrome install.
        additionalFlags: [
            '--window-size=1280,1096',
            '--disable-gpu',
            headless ? '--headless' : ''
        ]
    })

    return launcher.run().then(() => launcher)
        .catch((err: any) => {
            return launcher.kill().then(() => { // Kill Chrome if there's an error.
                throw err
            }, console.error)
        })
}