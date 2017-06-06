import express = require('express')
import {container} from '../ioc'
import {ScraperCoordinatorService} from '../services/scraper/scraper-coordinator.service'
import {Bank} from "../repositories/bank-info/bank.enum";
import {ProcessBankCompletePublisher} from '../rabbit/process-bank-complete.publisher'
export const rootRoutes = express.Router()

rootRoutes.get('/health', function (req: express.Request, res: express.Response, next: express.NextFunction) {
    res.send('OK')
})

rootRoutes.post('/search/:type', async function (req: express.Request, res: express.Response, next: express.NextFunction) {
    console.log('Req to process: ' + req.params.type)
    try {
        let testService = container.get<ScraperCoordinatorService>(ScraperCoordinatorService)
        let data = await testService.process(req.params.type)
        res.send({data})
    }catch(err){
        next(err)
    }
})

rootRoutes.post('/process/bank', async function (req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        let testService = container.get<ScraperCoordinatorService>(ScraperCoordinatorService)
        let data = await testService.processBank(req.body.bank, req.body.username)
        res.send({data})
    }catch(err){
        next(err)
    }
})

rootRoutes.post('/process/bank/MFA', async function (req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        let testService = container.get<ScraperCoordinatorService>(ScraperCoordinatorService)
        let data = await testService.processBankMFA(req.body.bank, req.body.username, req.body.targetId, req.body.answer)
        res.send({data})
    }catch(err){
        next(err)
    }
})

rootRoutes.post('/publish/test', async function (req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        let testService = container.get<ProcessBankCompletePublisher>(ProcessBankCompletePublisher)
        let data = await testService.publishMessage(req.body)
        res.send({data})
    }catch(err){
        next(err)
    }
})
