// Set your name
let userName = ''

//////////////////////////////////////////////////////
// Do not edit after
/////////////////////////////////////////////////////

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
	"TT:ATCCOM.AC_MODEL_TBM9.0.text": "TBM 930"
}

const debug = false
const version = "0.2.0"
const sessionID = debug ? 1234 : Date.now()
const groupName = 'global'

const localIp = '192.168.1.20'
if(debug) userName = 'crazyDev'

const iframePath = `/map/${groupName}?ingame&v=${version}&session=${sessionID}`
const iFrameServer = debug ? `http://${localIp}:8080` : 'https://flightsim.cloud'
const iframeUrl = iFrameServer + iframePath

const telemetryPath = '/d/ws/telemetryIn'
const telemetryServer = debug ? `ws://${localIp}:1816` : 'wss://flightsim.cloud'
const telemetryUrl = telemetryServer + telemetryPath

const linkerPath = '/d/ws/linker/p' + sessionID
const linkerServer = debug ? `ws://${localIp}:1816` : 'wss://flightsim.cloud'
const linkerUrl = linkerServer + linkerPath

let senderID = userName
if(senderID === ''){
	senderID = Math.random().toString(36).substring(2, 10)
}else
if(senderID.length > 10){
	senderID = senderID.substring(0, 9)
}

/*let IngamePanelCustomPanelLoaded = false
document.addEventListener('beforeunload', function(){
	IngamePanelCustomPanelLoaded = false
}, false)*/

class IngamePanelCustomPanel extends HTMLElement {
	constructor(){
		super()
		this.planeHidden = false
	}

	connectedCallback(){
		console.log('connectedCallback')

		this.m_toggleHidden = this.querySelector("#ToggleHidden")
		if(this.m_toggleHidden){
			this.m_toggleHidden.addEventListener("OnValidate", this.toggleHidden.bind(this))
		}

		this.telemetryConnection()
	//this.linkerConnection()
	}

	toggleHidden(){
		this.planeHidden = this.m_toggleHidden.toggled
	}

	openiFrame(){
		console.log('Open iFrame', iframeUrl)
		let iframe = document.querySelector("#CustomPanelIframe")
		if(iframe) iframe.src = iframeUrl
	}

	/***
	 * Telemetry
	 * ---------
	 * La telemetry envois la position de l'avion au server via un WebSocket `telemetryUrl`
	 * on ne fait que publier sur ce canal de communication
	 */

	telemetryConnection(){
		console.log('Connecting to Telemetry socket...', telemetryUrl)
		this.telemetry = new WebSocket(telemetryUrl)

		this.telemetry.onopen = this.telemetryOnOpen.bind(this)
		this.telemetry.onerror = this.telemetryOnError.bind(this)
		this.telemetry.onclose = this.telemetryOnClose.bind(this)
	}

	telemetryOnOpen(){
		this.openiFrame()

		// prevent null/0 data
		setTimeout(() => this.updatePos(), 1000)
	}

	telemetryOnError(error){
		console.log('TELEMETRY ERROR')
		console.error(error)
	}

	telemetryOnClose(){
		console.log('TELEMETRY CLOSED, retry in 1s')
		setTimeout(this.telemetryConnection, 1000)
	}

	updatePos(){
		console.log('Update pos')

		let atcModel = SimVar.GetSimVarValue("ATC MODEL", "string", "FMC")
		if(atcModelDic[atcModel]) atcModel = atcModelDic[atcModel]

		const atcId = SimVar.GetSimVarValue("ATC ID", "string", "FMC")
		const atcAirline = SimVar.GetSimVarValue("ATC AIRLINE", "string")

		const atcFlightNumber = SimVar.GetSimVarValue("ATC FLIGHT NUMBER", "string")

		const lat = SimVar.GetSimVarValue("PLANE LATITUDE", "degree latitude")

		const lng = SimVar.GetSimVarValue("PLANE LONGITUDE", "degree longitude")

		let alt = SimVar.GetSimVarValue("PLANE ALTITUDE", "feet")
		if(alt) alt = alt.toFixed(2)

		let hdg = SimVar.GetSimVarValue("PLANE HEADING DEGREES TRUE", "degree")
		//if (hdg) { hdg = hdg.toFixed(5) }

		const speed = SimVar.GetSimVarValue("AIRSPEED INDICATED", "knots")

		let vspeed = SimVar.GetSimVarValue("VERTICAL SPEED", "Feet per second")
		if(vspeed) vspeed = vspeed.toFixed(2)

		const data = {
			hidden: this.planeHidden,
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
			vspeed
		}

		console.log(data)

		this.telemetry.send(JSON.stringify(data))

		setTimeout(() => this.updatePos(), 1000)
	}

	/***
	 * Linker
	 * ------
	 * Le linker fait le lien entre le panel et la iframe, c'est une communication limitée à un utilisateur
	 * Ce canal permet à la iFrame de recevoir des données du jeu (Coherent / SimVar ...) sans devoir changer le Panel
	 */

	linkerConnection(){
		console.log('Connecting to Linker socket...', linkerUrl)
		this.linker = new WebSocket(linkerUrl)

		this.linker.onopen = this.linkerOnOpen.bind(this)
		this.linker.onerror = this.linkerOnError.bind(this)
		this.linker.onclose = this.linkerOnClose.bind(this)
		this.linker.onmessage = this.linkerOnMessage.bind(this)
	}

	linkerOnOpen(){
		console.log('LINKER opened')
	}

	linkerOnError(error){
		console.log('LINKER error')
		console.error(error)
	}

	linkerOnClose(){
		console.log('LINKER CLOSED, retry in 1s')
		setTimeout(this.linkerConnection, 1000)
	}

	linkerOnMessage(msg){
		console.log(msg.data)

		if(msg.data === 'coucou') return

		try {
			const res = JSON.parse(msg.data)
			console.log(res)

			this.handleMsg(res)
		} catch(err) {
			console.log('Error decoding JSON')
			console.error(err)
		}
	}

	handleMsg(msg){
		if(msg.type === 'simVarSubscribe') this.simVarSubscribe(msg.payload)
	}

	simVarSubscribe(conf){
		const {reply, period, vars} = conf

		const work = () => {
			const values = vars.map(simvar => {
				const v = SimVar.GetSimVarValue(simvar.name, simvar.unit, simvar.source)
				return {name: simvar.name, value: v}
			})

			const msg = {
				type: reply,
				payload: {
					hidden: this.planeHidden,
					user: senderID,
					group: groupName,
					vars: values
				}
			}

			const msgJson = JSON.stringify(msg)
			this.linker.send(msgJson)
		}

		work()
		setInterval(work, period)
	}

}

window.customElements.define("ingamepanel-custom", IngamePanelCustomPanel)
checkAutoload()
