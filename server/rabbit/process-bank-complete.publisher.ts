import {injectable} from 'inversify'
import * as amqp from 'amqp'

@injectable()
export class ProcessBankCompletePublisher {
    private connection: any
    private exchange: any

    public init(){
        let connection = amqp.createConnection({url: "amqp://guest:guest@localhost:5672"})
        let _this = this
        connection.on('ready', function() {
            console.log('Connected to Rabbit for Publishing')
            _this.exchange = connection.exchange('process-bank-complete-exchange')
        })
        connection.on('disconnect', function(params: any) {
            console.log('Disconnected from Rabbit', params.err.stack);
        })

        this.connection = connection
    }

    public publishMessage(msg: any){
        this.exchange.publish('', msg, null, (result: any) => {
            console.log('Message Publsihed. Result: ' + result)
        })
    }
}