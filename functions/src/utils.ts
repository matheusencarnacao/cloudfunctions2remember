export class StringUtils{
    constructor(private valor: string){}
    convertToBase64(){
        return Buffer.from(this.valor, 'binary').toString('base64')
    }
    convertFromBase64(){
        return Buffer.from(this.valor, 'base64').toString('binary')
    }
}

export class DateUtils{
    constructor(private date:Date){}
    getPartition(){
        const ano = this.date.getFullYear()
        const mes = this.date.getMonth() + 1
        const dia = this.date.getDate()

        return ano.toString() + mes.toString() + dia.toString()
    }
}