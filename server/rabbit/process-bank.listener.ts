import {injectable} from 'inversify'
import * as amqp from 'amqp'

@injectable()
export class ProcessBankListener {
    private connection: any
    private queue: any

    public init(){
        let connection = amqp.createConnection({url: "amqp://guest:guest@localhost:5672"})
        let _this = this
        connection.on('ready', function() {
            console.log('Connected to Rabbit for listener')
            _this.queue = connection.queue('blah', {durable: true, autoDelete: false} null)

            _this.queue.subscribe(_this.handleMessage)
        })
        connection.on('disconnect', function(params: any) {
            console.log('Disconnected from Rabbit', params.err.stack);
        })

        this.connection = connection
    }

    private async handleMessage(message: any, headers: any, deliveryInfo: any, messageObject:any){
        // console.log('Got message', {
        //     msg: message,
        //     headers: headers,
        //     deliveryInfo: deliveryInfo,
        //     messageObject: messageObject
        // })
        console.log(JSON.parse(message.data))
    }
}