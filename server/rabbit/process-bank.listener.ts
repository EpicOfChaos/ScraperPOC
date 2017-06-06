import {injectable} from 'inversify'
import * as amqp from 'amqp'
import {ScraperCoordinatorService} from '../services/scraper/scraper-coordinator.service'

@injectable()
export class ProcessBankListener {
    private connection: any
    private queue: any

    constructor(private scraperCoordinatorService: ScraperCoordinatorService) {}

    public init(){
        let connection = amqp.createConnection({url: "amqp://guest:guest@localhost:5672"})
        let _this = this
        connection.on('ready', function() {
            console.log('Connected to Rabbit for listener')
            _this.queue = connection.queue('process-bank-exchange => test', {durable: true, autoDelete: false}, null)

            _this.queue.subscribe(async (message: any, headers: any, deliveryInfo: any, messageObject:any) => {
                let messageJson: any = JSON.parse(message.data)
                console.log('Received Process Bank Message: ' + JSON.stringify(messageJson))
                await _this.scraperCoordinatorService.processBank(messageJson.bank, messageJson.username)

            })
        })
        connection.on('disconnect', function(params: any) {
            console.log('Disconnected from Rabbit', params.err.stack);
        })

        this.connection = connection
    }
}