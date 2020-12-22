//-------------------------------------------------------------------------------------
// IF YOU EDIT THE CODE BELLOW, A RANDOM KITTEN WILL BE MURDERED ON THE WEB
//-------------------------------------------------------------------------------------

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

const debug = true
const version = '0.2.0'
const groupName = debug ? 'global' : 'global'
const localIp = '192.168.1.20'

const iFrameServer = debug ? `http://${localIp}:8080` : 'https://flightsim.cloud'
const linkerServer = debug ? `ws://${localIp}:1816` : 'wss://flightsim.cloud'
const telemetryServer = debug ? `ws://${localIp}:1816` : 'wss://flightsim.cloud'

let IngamePanelCustomPanelLoaded = false
document.addEventListener('beforeunload', () => {
	IngamePanelCustomPanelLoaded = false
}, false)

class IngamePanelCustomPanel extends HTMLElement {

	constructor(){
		super()

		this.planeHidden = false
		this.subscribers = {}

		this.sessionID = debug ? 123 : Date.now()
		this.key = debug ? 456 : Math.random().toString(36).substring(2, 10)
		this.randomName = Math.random().toString(36).substring(2, 10)
		this.userName = null

		this.state = {}
	}

	connectedCallback(){
		console.log('connectedCallback')

		console.log('Start Linker socket')
		this.linkerConnection()

		this.m_toggleHidden = this.querySelector("#ToggleHidden")
		if(this.m_toggleHidden){
			this.m_toggleHidden.toggled = false
			this.m_toggleHidden.addEventListener("OnValidate", this.toggleHidden.bind(this))
		}

		const debugDiv = this.querySelector('#debug')
		if(debug && debugDiv) debugDiv.innerHTML = `key:${this.key} sessionID:${this.sessionID}`

		this.openiFrame()

		// Reload the state from Storage when ready
		//RegisterViewListener('JS_LISTENER_DATASTORAGE', () => this.onDataStoreReady())
		window.document.addEventListener("dataStorageReady", () => this.onDataStoreReady())
	}

	onDataStoreReady(){
		console.log('Load state from DataStorage')
		this.state = this.loadState()
		console.log(this.state)

		console.log('Start telemetry socket')
		this.telemetryConnection()
	}

	loadState(){
		const state = GetStoredData('adv_vfr_state')
		if(state) return JSON.parse(state)

		return {}
	}

	saveState(data){
		console.log('SetStoredData')
		const nextState = Object.assign({}, this.state, data)
		const value = JSON.stringify(this.state)
		console.log(value)

		SetStoredData('adv_vfr_state', value)

		return nextState
	}

	toggleHidden(){
		this.planeHidden = this.m_toggleHidden.toggled
	}

	openiFrame(){
		const iframe = document.querySelector("#CustomPanelIframe")
		if(!iframe) return

		const url = iFrameServer + `/map/${groupName}/?ingame&v=${version}&session=${this.sessionID}&key=${this.key}`
		console.log('Open iFrame', url)

		iframe.src = url
		iframe.style.display = 'block'
	}

	getUserName(){
		return this.state.userName || this.randomName
	}



	/**
	 * Telemetry
	 * ------
	 * Telemetry socket sned plane/user position to the main server using a WebSocket
	 * We only use this channel to pubish data
	 */

	telemetryConnection(){
		if(this.telemetry) return

		const url = telemetryServer + '/d/ws/telemetryIn'

		console.log('Connecting to Telemetry socket...', url)
		this.telemetry = new WebSocket(url)

		this.telemetry.onopen = this.telemetryOnOpen.bind(this)
		this.telemetry.onerror = this.telemetryOnError.bind(this)
		this.telemetry.onclose = this.telemetryOnClose.bind(this)
	}

	telemetryOnOpen(){
		if(this.pushPos) clearInterval(this.pushPos)
		this.pushPos = setInterval(() => this.updatePos(), 1000)
	}

	telemetryOnError(error){
		console.log('TELEMETRY ERROR')
		console.log(error)
	}

	telemetryOnClose(){
		console.log('TELEMETRY CLOSED, retry in 3s')
		setTimeout(() => this.telemetryConnection(), 3000)
	}

	updatePos(){

		let atcModel = SimVar.GetSimVarValue("ATC MODEL", "string", "FMC")
		let atcModelHuman = atcModel
		if(atcModelDic[atcModel]) atcModelHuman = atcModelDic[atcModel]

		const atcId = SimVar.GetSimVarValue("ATC ID", "string", "FMC")
		const atcAirline = SimVar.GetSimVarValue("ATC AIRLINE", "string")

		const atcFlightNumber = SimVar.GetSimVarValue("ATC FLIGHT NUMBER", "string")

		const lat = SimVar.GetSimVarValue("PLANE LATITUDE", "degree latitude")

		const lng = SimVar.GetSimVarValue("PLANE LONGITUDE", "degree longitude")

		let alt = SimVar.GetSimVarValue("PLANE ALTITUDE", "feet")
		if(alt) alt = alt.toFixed(2)

		let hdg = SimVar.GetSimVarValue("PLANE HEADING DEGREES TRUE", "degree")
		//if(hdg) hdg = hdg.toFixed(5)

		const speed = SimVar.GetSimVarValue("AIRSPEED INDICATED", "knots")

		let vspeed = SimVar.GetSimVarValue("VERTICAL SPEED", "Feet per second")
		if(vspeed) vspeed = vspeed.toFixed(2)

		const data = {
			hidden: this.planeHidden,
			user: this.getUserName(),
			group: groupName,
			uuid: this.sessionID,
			atcModelRaw: atcModel,
			atcModel: atcModelHuman,
			// ---
			lng,
			lat,
			alt,
			hdg,
			atcId,
			atcAirline,
			atcFlightNumber,
			speed,
			vspeed
		}

		//console.log('Update pos', data)
		this.telemetry.send(JSON.stringify(data))
	}



	/***
	 * Linker
	 * ------
	 * Linker is used to create a communication channel between the iframe and this panel. Therefor we can send action
	 * from the iFrame to the panel and access Coherent or Simvar without building a new version of the panel
	 * This is strictly limited to a single user
	 */

	linkerConnection(){
		if(this.linker) return

		const url = linkerServer + '/d/ws/linker/p' + this.key
		console.log('Connecting to Linker socket...', url)

		this.linker = new WebSocket(url)

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
		console.log('LINKER CLOSED, retry in 3s')
		setTimeout(() => this.linkerConnection(), 3000)
	}

	linkerOnMessage(msg){
		if(msg.data === 'coucou') return

		/*console.log('Raw MSG')
		console.log(msg.data)*/

		try {
			const res = JSON.parse(msg.data)
			this.handleMsg(res)
		} catch(err) {
			console.log('Error decoding JSON')
			console.error(err)
		}
	}

	linkerSend(data){
		console.log('Send to linker (DATA)', data)
		const json = JSON.stringify(data)

		console.log('Send to linker (JSON)', json)
		this.linker.send(json)
	}

	handleMsg(msg){
		console.log('Object MSG')
		console.log(msg)

		if(msg.type === 'getSimVar') this.getSimVar(msg.id, msg.payload)
		if(msg.type === 'setSimVar') this.setSimVar(msg.id, msg.payload)
		if(msg.type === 'subscribeSimVar') this.subscribeSimVar(msg.id, msg.payload)
		if(msg.type === 'unsubscribeSimVar') this.unsubscribeSimVar(msg.id)

		if(msg.type === 'getState') this.getState(msg.id, msg.payload)
		if(msg.type === 'setState') this.setState(msg.id, msg.payload)
	}

	// SimVar

	getSimVar(id, vars){
		console.log('getSimVar()')
		console.log('id')
		console.log(id)

		console.log('vars')
		console.log(vars)

		const values = vars.map(simvar => {
			const v = SimVar.GetSimVarValue(simvar.name, simvar.unit, simvar.source)
			return {name: simvar.name, value: v}
		})

		this.linkerSend({
			id,
			type: 'getSimVar',
			payload: values
		})
	}

	setSimVar(id, vars){
		console.log('setSimVar()')
		console.log('id')
		console.log(id)

		console.log('vars')
		console.log(vars)

		vars.forEach(simvar => {
			const v = SimVar.SetSimVarValue(simvar.name, simvar.unit, simvar.value, simvar.source)
			return {name: simvar.name, value: v}
		})
	}

	subscribeSimVar(id, msg){
		const {period, vars} = msg

		const work = () => {
			const values = vars.map(simvar => {
				const v = SimVar.GetSimVarValue(simvar.name, simvar.unit, simvar.source)
				return {name: simvar.name, value: v}
			})

			const msg = {
				id,
				type: 'subscribeSimVar',
				payload: {
					hidden: this.planeHidden,
					user: this.getUserName(),
					group: groupName,
					vars: values
				}
			}

			this.linkerSend(msg)
		}

		work()
		this.subscribers[id] = setInterval(work, period)
	}

	unsubscribeSimVar(id){
		console.log('Clear interval', id)

		if(!this.subscribers[id]) return
		clearInterval(this.subscribers[id])
	}

	// State

	getState(id){
		this.linkerSend({
			id,
			type: 'getState',
			payload: this.state
		})
	}

	setState(id, data){
		console.log('setStorage()')

		console.log('id')
		console.log(id)

		console.log('data')
		console.log(data)

		this.state = this.saveState(data)

		//

		this.linkerSend({
			id,
			type: 'setState',
			payload: this.state
		})
	}

}

window.customElements.define("ingamepanel-custom", IngamePanelCustomPanel)
checkAutoload()
