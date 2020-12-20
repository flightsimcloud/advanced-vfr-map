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
const version = '0.3.0'
const groupName = debug ? 'global' : 'global'
const localIp = '192.168.1.20'

const iFrameServer = debug ? `http://${localIp}:8080` : 'https://flightsim.cloud'
const linkerServer = debug ? `ws://${localIp}:1816` : 'wss://flightsim.cloud'
const telemetryServer = false ? `ws://${localIp}:1816` : 'wss://flightsim.cloud'

let IngamePanelCustomPanelLoaded = false
document.addEventListener('beforeunload', () => {
	IngamePanelCustomPanelLoaded = false
}, false)

class IngamePanelCustomPanel extends HTMLElement {

	constructor(){
		super()

		this.view = ''
		this.planeHidden = false

		this.sessionID = debug ? 123 : Date.now()
		this.key = debug ? '456' : Math.random().toString(36).substring(2, 10)
		this.randomName = Math.random().toString(36).substring(2, 10)

		this.user = {}
	}

	connectedCallback(){
		console.log('connectedCallback')

		this.m_toggleHidden = this.querySelector("#ToggleHidden")
		if(this.m_toggleHidden){
			this.m_toggleHidden.toggled = false
			this.m_toggleHidden.addEventListener("OnValidate", this.toggleHidden.bind(this))
		}

		this.m_toggleSettings = this.querySelector("#ToggleSettings")
		if(this.m_toggleSettings){
			this.m_toggleSettings.toggled = false
			this.m_toggleSettings.addEventListener("OnValidate", this.toggleSettings.bind(this))
		}

		// Views
		this.viewUserSettings = this.querySelector('#user-settings')
		this.iframe = document.querySelector("#CustomPanelIframe")

		// Settings
		this.i_userName = this.querySelector('input#user-name')
		this.b_userSave = this.querySelector('#user-save')
		if(this.b_userSave) this.b_userSave.addEventListener("OnValidate", this.saveUser.bind(this))

		const debugDiv = this.querySelector('#debug')
		if(debug && debugDiv) debugDiv.innerHTML = `key:${this.key} sessionID:${this.sessionID}`

		this.updateUi()

		// Reload the user from Storage when ready
		RegisterViewListener('JS_LISTENER_DATASTORAGE', () => this.onDataStoreReady())
	}

	onDataStoreReady(){
		const user = this.getUser()

		if(user){
			// Save globally
			this.user = user

			// Open the map (the user exists)
			console.log('User exists, load the map')
			this.setView('map')
		}else{
			console.log('No user in the store => open settings')
			this.openSettings()
		}

		// Start sockets
		this.telemetryConnection()
		this.linkerConnection()
	}

	getUser(){
		const user = GetStoredData('adv_vfr_user')
		if(user) return JSON.parse(user)

		return {
			name: ''
		}
	}

	saveUser(){
		this.user = Object.assign({}, this.user, {
			name: this.i_userName.value
		})

		const value = JSON.stringify(this.user)
		SetStoredData('adv_vfr_user', value)
	}

	toggleHidden(){
		this.planeHidden = this.m_toggleHidden.toggled
	}

	toggleSettings(){
		if(this.m_toggleSettings.toggled) return this.setView('settings')
		this.setView('map')
	}

	setView(next){
		this.view = next
		this.updateUi()
	}

	updateUi(){
		if(this.view === 'settings'){
			this.openSettings()
			this.closeiFrame()
		}else
		if(this.view === 'map'){
			this.closeSettings()
			this.openiFrame()
		}
	}

	// Helpers

	openSettings(){
		this.viewUserSettings.style.display = 'block'
		this.m_toggleSettings.toggled = true

		this.i_userName.value = this.user.name || ''
	}

	closeSettings(){
		this.viewUserSettings.style.display = 'none'
		this.m_toggleSettings.toggled = false
	}

	openiFrame(){
		if(!this.iframe) return

		const url = iFrameServer + `/map/${groupName}?ingame&__v=${version}&session=${this.sessionID}&key=${this.key}`
		console.log('Open iFrame', url)

		this.iframe.src = url
		this.iframe.style.display = 'block'
	}

	closeiFrame(){
		if(!this.iframe) return
		console.log('Close iFrame')

		this.iframe.src = ''
		this.iframe.style.display = 'none'
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
		//if (hdg) { hdg = hdg.toFixed(5) }

		const speed = SimVar.GetSimVarValue("AIRSPEED INDICATED", "knots")

		let vspeed = SimVar.GetSimVarValue("VERTICAL SPEED", "Feet per second")
		if(vspeed) vspeed = vspeed.toFixed(2)

		let userName = this.user && this.user.name ? this.user.name : this.randomName
		userName = userName.substring(0, 9)

		const data = {
			hidden: this.planeHidden,
			user: userName,
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

	handleMsg(msg){
		console.log('Object MSG')
		console.log(msg)

		if(msg.type === 'getSimVar') this.getSimVar(msg.id, msg.payload)
		if(msg.type === 'setSimVar') this.setSimVar(msg.id, msg.payload)

		/*
		if(msg.type === 'simVarSubscribe') this.simVarSubscribe(msg.payload)*/
	}

	getSimVar(id, vars){
		console.log('getSimVar()')
		/*console.log('id')
		console.log(id)
		console.log('vars')
		console.log(vars)*/

		const values = vars.map(simvar => {
			const v = SimVar.GetSimVarValue(simvar.name, simvar.unit, simvar.source)
			return {name: simvar.name, value: v}
		})

		const msg = {
			id,
			type: 'getSimVar',
			payload: values
		}

		console.log('SEND OBJ', msg)
		console.log(msg)

		const msgJson = JSON.stringify(msg)
		this.linker.send(msgJson)
	}

	setSimVar(id, vars){
		console.log('setSimVar()')
		console.log('id')
		console.log(id)

		console.log('vars')
		console.log(vars)

		// SetSimVarValue(name, unit, value, dataSource = "")

		vars.forEach(simvar => {
			const v = SimVar.SetSimVarValue(simvar.name, simvar.unit, simvar.value, simvar.source)
			return {name: simvar.name, value: v}
		})

/*
		const values = vars.map(simvar => {

		})

		const msg = {
			id,
			type: 'getSimVar',
			payload: values
		}

		console.log('SEND OBJ', msg)
		console.log(msg)

		const msgJson = JSON.stringify(msg)
		this.linker.send(msgJson)
*/
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
