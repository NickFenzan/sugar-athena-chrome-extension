const PATIENT_MENU_ID = 'patientsmenucomponent';
const NEW_PATIENT_BUTTON_ID = '2cc1cab777a698baa62c605bd4fc30ec';
const NEW_PATIENT_SAVE_BUTTON_IDS = [
  'RegistrationSaveButton',
  'RegistrationSaveInsuranceButton',
  'RegistrationSaveInsuranceButton'
];
const athenaPatientFieldInformation = [
  {id:"lastName",name:"LASTNAME",type:"text"},
  {id:"firstName",name:"FIRSTNAME",type:"text"},
  {id:"sex",name:"SEX",type:"select"},
  {id:"dob",name:"DOB",type:"text"},
  {id:"address",name:"ADDRESS1",type:"text"},
  {id:"zip",name:"ZIP",type:"text"},
  {id:"city",name:"CITY",type:"text"},
  {id:"state",name:"STATE_select",type:"select"},
  {id:"phoneHome",name:"HOMEPHONE",type:"text"},
  {id:"phoneCell",name:"MOBILEPHONE",type:"text"},
  {id:"consentToText",name:"rb_CONSENTTOTEXTRADIO_1",type:"radio"},
  {id:"phoneWork",name:"WORKPHONE",type:"text"},
  {id:"email",name:"EMAIL",type:"text"},
  {id:"noEmail",name:"noemail",type:"checkbox"},
  {id:"usualProvider",name:"PRIMARYPROVIDERID",type:"select"},
  {id:"howDidYouHearAboutUs",name:"REFERRALSOURCEID",type:"select"},
  {id:"consentToCall",name:"rb_CONSENTTOCALLFLAG_1",type:"radio"},
  {id:"relationshipToGuarantor",name:"RELATIONSHIPTOPATIENTID",type:"select"}
];

function changePatient(data){
  var pid = data.pid;
  var s = document.createElement('script');
  s.setAttribute("type","text/javascript");
  s.innerHTML = "CurrentPatient.V1.SetCurrentPatient({PATIENTID:" + pid + "});";
  document.body.appendChild(s);
}
function getMainFrame(){
  var globalWrapper = document.getElementById('GlobalWrapper').contentWindow.document;
  var frameContent = globalWrapper.getElementById('frameContent').contentWindow.document;
  return frameContent.getElementById('frMain');
}
function sugarToAthenaPatient(patientInfo){
  function navigateToNewPatientRegistrationPage(){
    return new Promise((resolve,reject)=>{
      function patientRegistrationPageLoaded(){
        getMainFrame().removeEventListener('load',patientRegistrationPageLoaded);
        resolve();
      }
      function clickNewPatientRegistrationLink(){
        var navDocument = document.getElementById('GlobalNav').contentWindow.document;
        var patientMenu = navDocument.getElementById(PATIENT_MENU_ID);
        patientMenu.dispatchEvent(new MouseEvent('click'));
        var newPatientButton = document.getElementById(NEW_PATIENT_BUTTON_ID);
        newPatientButton.dispatchEvent(new MouseEvent('mousedown'));
      }
      clickNewPatientRegistrationLink()
      getMainFrame().addEventListener('load', patientRegistrationPageLoaded);
    })
  }
  function attachListenersToSaveButtons(){
    var mainFrame = getMainFrame();
    var mainDocument = mainFrame.contentWindow.document;
    for(var i = 0; i < NEW_PATIENT_SAVE_BUTTON_IDS.length; i++) {
      var saveButton = mainDocument.getElementById(NEW_PATIENT_SAVE_BUTTON_IDS[i]);
      saveButton.addEventListener('click',()=>{
        mainFrame.addEventListener('load',onPageSave);
      })
    }
  }
  function fillOutNewPatientForm(patientInfo) {
    function transformPatientInfo(patientInfo) {
      var transformedPatientInfo = Object.assign({},patientInfo);
      var phoneHome = patientInfo.phoneHome;
      var phoneMobile = patientInfo.phoneCell;
      if(phoneHome && !phoneMobile){
        phoneMobile = phoneHome;
      } else if (!phoneHome && phoneMobile){
        phoneHome = phoneMobile;
      }
      transformedPatientInfo.sex = patientInfo.sex.substring(0,1);
      transformedPatientInfo.phoneHome = phoneHome;
      transformedPatientInfo.phoneMobile = phoneMobile;
      transformedPatientInfo.noEmail = (patientInfo.email) ? false : true;
      transformedPatientInfo.dob = (patientInfo.dob) ? patientInfo.dob : "01/01/1900";
      //This means self
      transformedPatientInfo.relationshipToGuarantor = 1;
      //JMiller
      transformedPatientInfo.usualProvider = 1;
      //Contact Center
      transformedPatientInfo.howDidYouHearAboutUs = 1112;
      return transformedPatientInfo;
    }
    function findFields(mainDocument){
      var fields = {};
      for(var i = 0; i < athenaPatientFieldInformation.length; i++) {
        var fieldInfo = athenaPatientFieldInformation[i];
        if (fieldInfo.type == "radio") {
          fields[fieldInfo.id] = mainDocument.getElementById(fieldInfo.name);
        } else {
          fields[fieldInfo.id] = mainDocument.querySelector('[name="' + fieldInfo.name + '"]');
        }
      }
      return fields;
    }
    function fillPatientInformationIntoFields(patientInfo, fields){
      function textFieldFill(id, sendChangeEvent = true){
        fields[id].value = (patientInfo[id]) ? patientInfo[id] : "";
        if(sendChangeEvent){
          fields[id].dispatchEvent(new Event('change'));
        }
      }
      function selectFieldFill(id, sendChangeEvent = true){
        textFieldFill(id)
      }
      function checkboxFieldFill(id, sendChangeEvent = true){
        var currentValue = fields[id].checked;
        var desiredValue = (patientInfo[id]) ? patientInfo[id] : false;
        if(sendChangeEvent){
          fields[id].dispatchEvent(new MouseEvent('click'));
          if(currentValue == desiredValue){
            fields[id].dispatchEvent(new MouseEvent('click'));
          }
        }else{
          fields[id].checked = desiredValue
        }
      }

      textFieldFill('email');
      checkboxFieldFill('noEmail');
      textFieldFill('address');
      textFieldFill('city');
      textFieldFill('state');
      textFieldFill('zip');
      selectFieldFill('relationshipToGuarantor');
      selectFieldFill('usualProvider');
      selectFieldFill('howDidYouHearAboutUs');
      fields.consentToText.checked = true;
      fields.consentToCall.checked = true;
      textFieldFill('lastName',true);
      textFieldFill('firstName',true);
      textFieldFill('dob',true);
      selectFieldFill('sex',true);
      textFieldFill('phoneHome',true);
      textFieldFill('phoneCell',true);
      textFieldFill('phoneWork',true);

    }

    var transformedPatientInfo = transformPatientInfo(patientInfo);
    var mainDocument = getMainFrame().contentWindow.document;
    var fields = findFields(mainDocument);
    fillPatientInformationIntoFields(transformedPatientInfo, fields);
  }
  function onPageSave(){
      var mainFrame = getMainFrame();
      mainFrame.removeEventListener('load',onPageSave);
      try {
        var mainDocument = mainFrame.contentWindow.document;
        var lis = mainDocument.querySelectorAll('#patientworkflowheading li')
        var pid = lis[2].textContent.substring(1);
        var event = {
          type: 'athena-patient-saved',
          data: {
            'pid': pid
          }
        };
        chrome.runtime.sendMessage(event);
      }catch(e){
        console.log('Couldn\'t find PID');
        console.log(e);
      }
    }

  navigateToNewPatientRegistrationPage().then(()=>{
    attachListenersToSaveButtons();
    fillOutNewPatientForm(patientInfo);
  });
}
function messageListener(request, sender, sendResponse){
  var messagePaths = {
    "sugar-to-athena-patient": sugarToAthenaPatient,
    "change-patient": changePatient
  }
  try{
    messagePaths[request.type](request.data);
  }catch(e){
    console.log('No valid path for message');
    console.log(e);
  }
}


chrome.runtime.onMessage.addListener(messageListener);
