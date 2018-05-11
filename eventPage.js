const ATHENA_URL = "https://athenanet.athenahealth.com/";
const SUGAR_URL = "https://sugar.millervein.com/sugar/";

var Service = function(name, baseUrl){
  var name = name;
  var baseUrl = baseUrl;
  var tab;

  var create = () => {
    chrome.tabs.create({ url: baseUrl },(createdTab) => {
      tab = createdTab
    });
  }
  var getTab = () => {
    return tab;
  }
  var makeActive = () => {
    chrome.tabs.update(tab.id, {selected: true});
  }
  var sendMessage = (message) => {
    chrome.tabs.sendMessage(tab.id, message);
  }

  this.name = name;
  this.baseUrl = baseUrl;
  this.create = create;
  this.getTab = getTab;
  this.makeActive = makeActive;
  this.sendMessage = sendMessage;
  create();
}
var ServiceRegistry = {};

function messageListener(request, sender, sendResponse){
    function sendMessageAndMakeActive(serviceName, message){
      var service = ServiceRegistry[serviceName];
      service.makeActive();
      service.sendMessage(request);
    }

    switch(request.type){
      case "sugar-to-athena-patient":
        sendMessageAndMakeActive('athena',request);
        break;
      case "athena-patient-saved":
        console.log('got patient saved message');
        sendMessageAndMakeActive('sugar',request);
        break;
      default:
        throw new Error('Message did not supply a valid type');
    }
}
function initialize(){
  function initializeServiceRegistry() {
    ServiceRegistry = {
      "athena": new Service("athena",ATHENA_URL),
      "sugar": new Service("sugar",SUGAR_URL)
    };
  }
  function reopenImportantTabs(closingTabId, removeInfo){
    //We don't want to try to reopen anything if the window is closing
    if(removeInfo.isWindowClosing) {return;}
    for(name in ServiceRegistry){
      var service = ServiceRegistry[name]
      var serviceTab = service.getTab();
      if(serviceTab && serviceTab.id == closingTabId){
        service.create();
      }
    }
  }
  initializeServiceRegistry();
  chrome.tabs.onRemoved.addListener(reopenImportantTabs);
  chrome.runtime.onMessage.addListener(messageListener);
}

initialize();
