import express = require('express')
import {container} from '../ioc'
import {ScraperCoordinatorService} from '../services/scraper/scraper-coordinator.service'
import {ProcessBankCompletePublisher} from '../rabbit/process-bank-complete.publisher'
export const rootRoutes = express.Router()

rootRoutes.get('/health', healthCheck)

rootRoutes.post('/search/:type', searchPoc)

rootRoutes.post('/process/bank', processBank)

rootRoutes.post('/process/bank/MFA', processBankMFA)

rootRoutes.post('/publish/test', publishTest)

//Get reference to the DI services, only do this once for performance reasons, don't do it inside each function.
const scraperCoordinatorService = container.get<ScraperCoordinatorService>(ScraperCoordinatorService)
const processBankCompletePublisher = container.get<ProcessBankCompletePublisher>(ProcessBankCompletePublisher)

function healthCheck (req: express.Request, res: express.Response, next: express.NextFunction) {
    res.send('OK')
}

async function searchPoc(req: express.Request, res: express.Response, next: express.NextFunction) {
    console.log('Req to process: ' + req.params.type)
    try {
        let data = await scraperCoordinatorService.process(req.params.type)
        res.send({data})
    }catch(err){
        next(err)
    }
}

async function processBank(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        let data = await scraperCoordinatorService.processBank(req.body.bank, req.body.username)
        res.send({data})
    }catch(err){
        next(err)
    }
}

async function processBankMFA(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        let data = await scraperCoordinatorService.processBankMFA(req.body.bank, req.body.username, req.body.targetId, req.body.answer)
        res.send({data})
    }catch(err){
        next(err)
    }
}

async function publishTest(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        let data = await processBankCompletePublisher.publishMessage(req.body)
        res.send({data})
    }catch(err){
        next(err)
    }
}