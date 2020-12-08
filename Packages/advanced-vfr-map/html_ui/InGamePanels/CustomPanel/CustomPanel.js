// Set your name
let userName = ''

//////////////////////////////////////////////////////
// Do not edit after
/////////////////////////////////////////////////////


let IngamePanelCustomPanelLoaded = false;

const atcModelDic = {
    "TT:ATCCOM.AC_MODEL_A20N.0.text": "A320neo",
    "TT:ATCCOM.AC_MODEL A5.0.text": "A5",
    "TT:ATCCOM.AC_MODEL B350.0.text": "King Air 350i",
    "TT:ATCCOM.AC_MODEL_B748.0.text": "747-8 Intercontinental",
    "TT:ATCCOM.AC_MODEL_B78X.0.text": "787-10 Dreamliner",
    "TT:ATCCOM.AC_MODEL_BE36.0.text": "Bonanza G36",
    "TT:ATCCOM.AC_MODEL_BE58.0.text": "Baron G58",
    "TT:ATCCOM.AC_MODEL C152.0.text": "152",
    "TT:ATCCOM.AC_MODEL C172.0.text": "172 Skyhawk",
    "TT:ATCCOM.AC_MODEL C208.0.text": "208 B Grand Caravan EX",
    "TT:ATCCOM.AC_MODEL_C25C.0.text": "Citation CJ4",
    "TT:ATCCOM.AC_MODEL_C700.0.text": "Citation Longitude",
    "TT:ATCCOM.AC_MODEL_CC19.0.text": "XCub",
    "TT:ATCCOM.AC_MODEL CP10.0.text": "Cap10",
    "TT:ATCCOM.AC_MODEL_DA40.0.text": "DA40",
    "TT:ATCCOM.AC_MODEL_DA62.0.text": "DA62",
    "TT:ATCCOM.AC_MODEL_DR40.0.text": "DR400-100 Cadet",
    "TT:ATCCOM.AC_MODEL DV20.0.text": "DV20",
    "TT:ATCCOM.AC_MODEL E300.0.text": "330LT",
    "TT:ATCCOM.AC_MODEL_FDCT.0.text": "CTSL",
    "TT:ATCCOM.AC_MODEL_PIVI.0.text": "Virus SW121",
    "TT:ATCCOM.AC_MODEL PTS2.0.text": "Pitts Special S2S",
    "TT:ATCCOM.AC_MODEL_SAVG.0.text": "Savage Cub",
    "TT:ATCCOM.AC_MODEL_SR22.0.text": "SR22",
    "TT:ATCCOM.AC_MODEL_TBM9.0.text": "TBM 930",
};

const version = "0.1.0"
const sessionID = Date.now()
const groupName = 'global'
const serverUrl = 'wss://flightsim.cloud/d/ws/telemetryIn'
const iframeSrc = `https://flightsim.cloud/map/global?ingame&v=${version}`
let senderID = userName
if (senderID === '') {
    senderID = Math.random().toString(36).substring(2, 10)
} else if (senderID.length > 10) {
    senderID = senderID.substring(0, 9)
}

document.addEventListener('beforeunload', function () {
    IngamePanelCustomPanelLoaded = false;
}, false);

class IngamePanelCustomPanel extends HTMLElement {
    constructor() {
        super();
        let iframe = document.querySelector("#CustomPanelIframe");
        if (iframe) {
            iframe.src = iframeSrc;
        }
    }

    connectedCallback() {
        let self = this;
        this.socket = new WebSocket(serverUrl)
        this.socket.onopen = () => {
            // prevent null/0 data
            setTimeout(() => {
                this.updatePos()
            }, 1000)
        }
        let iframe = document.querySelector("#CustomPanelIframe");
        if (iframe) {
            iframe.src = iframeSrc;
        }
    }


    updatePos() {
        let atcModel = SimVar.GetSimVarValue("ATC MODEL", "string", "FMC");
        if (atcModelDic[atcModel]) atcModel = atcModelDic[atcModel];

        const atcId = SimVar.GetSimVarValue("ATC ID", "string", "FMC");
        const atcAirline = SimVar.GetSimVarValue("ATC AIRLINE", "string");

        const atcFlightNumber = SimVar.GetSimVarValue("ATC FLIGHT NUMBER", "string");

        const lat = SimVar.GetSimVarValue("PLANE LATITUDE", "degree latitude");

        const lng = SimVar.GetSimVarValue("PLANE LONGITUDE", "degree longitude");

        let alt = SimVar.GetSimVarValue("PLANE ALTITUDE", "feet");
        if (alt) alt = alt.toFixed(2)

        let hdg = SimVar.GetSimVarValue("PLANE HEADING DEGREES TRUE", "degree");
        //if (hdg) { hdg = hdg.toFixed(5) };

        const speed = SimVar.GetSimVarValue("AIRSPEED INDICATED", "knots");
        let vspeed = SimVar.GetSimVarValue("VERTICAL SPEED", "Feet per second");
        if (vspeed) vspeed = vspeed.toFixed(2)

        const data = {
            user: senderID,
            group: groupName,
            lng: lng,
            lat,
            alt,
            hdg,
            uuid: sessionID,
            atcModel,
            atcId,
            atcAirline,
            atcFlightNumber,
            speed,
            vspeed,
        }
        this.socket.send(JSON.stringify(data))
        setTimeout(() => {
            this.updatePos()
        }, 1000)
    }


}

window.customElements.define("ingamepanel-custom", IngamePanelCustomPanel);
checkAutoload();
