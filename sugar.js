const sugarPatientFields = [
  {id:"firstName",name:"first_name",type:"text"},
  {id:"lastName",name:"last_name",type:"text"},
  {id:"dob",name:"date_of_birth_c",type:"text"},
  {id:"address",name:"primary_address_street",type:"text"},
  {id:"city",name:"primary_address_city",type:"text"},
  {id:"state",name:"primary_address_state",type:"text"},
  {id:"zip",name:"primary_address_postalcode",type:"text"},
  {id:"email",name:"email",type:"nestedText"},
  {id:"phoneCell",name:"phone_mobile",type:"text"},
  {id:"sex",name:"sex_c",type:"select"},
  {id:"athenaPatientId",name:"athena_patient_id_c",type:"text"}
];
const saveButtonSelector = '.headerpane>h1>div [name="save_button"]';
const pathExpressions = {
  patient: {
    create: /^\/#Leads\/create$/gi
  }
}
const customButtonClass = 'athena-sync';

function fieldNameLookup(id){
  for(var i = 0; i < sugarPatientFields.length; i++){
    var field = sugarPatientFields[i];
    if(field.id == id){
      return field.name;
    }
  }
  return null;
}
function removeExistingButtons(){
  var existingButtons = document.querySelectorAll('.' + customButtonClass) || {};
  for(var i = 0; i < existingButtons.length; i++){
    var button = existingButtons[i];
    button.remove();
  }
}
function onAddressChange(){
  var extractPath = (sugarUrl) => {
    var pathRegex = RegExp('^http[s]?:\/\/sugar.millervein.com\/sugar(.+)$','gi');
    var pathMatches = pathRegex.exec(window.location.href);
    return pathMatches[1];
  }
  var path = extractPath(window.location.href);
  removeExistingButtons();
  if (path){
    if(path.match(pathExpressions.patient.create)){
      setTimeout(addButtonToPatientEdit,500);
    }
  }
}
function addButtonToPatientEdit() {
  function createButton(){
    var aText = document.createTextNode('Create in Athena');

    var a = document.createElement('a');
    a.setAttribute('class', 'btn btn-invisible btn-link');
    a.appendChild(aText);

    var span = document.createElement('span');
    span.setAttribute('class','detail ' + customButtonClass)
    span.appendChild(a);

    return span;
  }
  function syncToAthena() {
    function preparePatientInfo() {
      function fieldValues(fields){
        function textValue(field, values){
          var elem = document.querySelector('[name="' + field.name + '"]');
          if (elem) {
            values[field.id] = elem.value;
          } else {
            throw new Error('Could not find field ' + field.name);
          }
        }
        function nestedTextValue(field, values){
          var elem = document.querySelector('[data-fieldname="' + field.name + '"] input');
          if (elem) {
            values[field.id] = elem.value;
          } else {
            throw new Error('Could not find field ' + field.name);
          }
        }
        function selectValue(field, values) {
          return textValue(field, values);
        }
        var values = {};
        for(var i = 0; i < fields.length; i++){
          var field = fields[i];
          if(field.type == "text") {
            textValue(field, values);
          } else if(field.type == "nestedText") {
            nestedTextValue(field, values);
          } else if(field.type == "select") {
            selectValue(field, values);
          } else {
            throw new Error('Unsupported field type');
          }
        }
        return values;
      }
      function validatePatientInfo(patientInfo) {
        if(!patientInfo.lastName){
          throw new Error('Last Name required to sync');
        }
        if(!patientInfo.firstName){
          throw new Error('First Name required to sync');
        }
        if(!patientInfo.sex){
          throw new Error('Sex required to sync');
        }
        if(!patientInfo.phoneCell && !patientInfo.email){
          throw new Error('Phone number or email address required to sync');
        }
      }
      var patientInfo = fieldValues(sugarPatientFields);
      validatePatientInfo(patientInfo);
      return patientInfo;
    }
    function sendInfoToAthena(patientInfo){
      var message = {
        type: "sugar-to-athena-patient",
        data: patientInfo
      }
      chrome.runtime.sendMessage(message,(r)=>{
        console.log('done syncing');
        console.log(r)
      });
    }
    console.log('time to sync');
    try{
      var patientInfo = preparePatientInfo();
      sendInfoToAthena(patientInfo);
    }catch(e){
      alert(e.message);
      throw e;
    }
  }

  var saveButtons = document.querySelectorAll(saveButtonSelector);
  for (var i = 0; i < saveButtons.length; i++){
    var saveButtonSpan = saveButtons[i].parentElement;
    var button = createButton();
    button.addEventListener('click',syncToAthena);
    saveButtonSpan.parentElement.insertBefore(button,saveButtonSpan);
  }
}
function fillAthenaId(data) {
  var pid = data.pid;
  var pidFieldName = fieldNameLookup('athenaPatientId');
  var athenaPidFields = document.querySelectorAll('[name="' + pidFieldName + '"]');
  for(var i = 0; i < athenaPidFields.length; i++){
    var field = athenaPidFields[i];
    field.value = pid;
  }
}
function messageListener(request, sender, sendResponse){
  var messagePaths = {
    "athena-patient-saved": fillAthenaId
  }
  try{
    messagePaths[request.type](request.data);
  }catch(e){
    console.log('No valid path for message');
    console.log(e);
  }
}

window.addEventListener("hashchange", onAddressChange);
chrome.runtime.onMessage.addListener(messageListener);
