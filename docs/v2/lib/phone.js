import phoneLibrary from '../vendor/phone.js';
import {validatePhone,finding,makeReport} from './model.js';
export function analyzePhone(value){
 const text=validatePhone(value),number=phoneLibrary.parsePhoneNumberFromString(text,{extract:false});
 if(!number)throw new Error('Номер не вдалося розібрати за міжнародним планом нумерації.');
 const source={source:'libphonenumber-js · Google numbering metadata',sourceUrl:'https://github.com/catamphetamine/libphonenumber-js',sourceVersion:'1.13.7'};
 const type=number.getType();
 const region=number.country?new Intl.DisplayNames(['uk'],{type:'region'}).of(number.country):'Негеографічний або спільний план';
 return makeReport('phone',[
 finding('PHONE_FORMAT','Нормалізований номер','derived','Результат розбору введеного значення. Дані оброблені локально.',{...source,category:'Формат',fields:[{label:'E.164',value:number.number,sensitive:true},{label:'Міжнародний формат',value:number.formatInternational(),sensitive:true},{label:'Код виклику',value:'+'+number.countryCallingCode}]}),
 finding('PHONE_PLAN','План нумерації','derived','Країна і тип визначені за метаданими нумерації. Це не дані поточного оператора чи місцезнаходження абонента.',{...source,category:'План',fields:[{label:'Регіон плану',value:region+(number.country?' ('+number.country+')':'')},{label:'Допустима довжина',value:number.isPossible()?'Так':'Ні'},{label:'Відповідає шаблону плану',value:number.isValid()?'Так':'Ні'},{label:'Тип за метаданими',value:type||'Не визначено'}]}),
 finding('PHONE_SCOPE','Власник та активність','unknown','Призначення номера абоненту, активність, власник і поточний оператор не перевірялися.',{source:'Межі перевірки',category:'Межі',scope:{assigned:null,active:null,owner:null,currentCarrier:null},fields:[{label:'Зовнішні запити',value:'Не виконувалися'}]})
 ],{transport:'local-metadata',subject:null,notices:['isValid означає відповідність плану нумерації. Це не підтвердження існування або активності номера.']});
}

