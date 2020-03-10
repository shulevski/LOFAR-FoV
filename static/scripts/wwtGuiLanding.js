// Create the WorldWide telescope object variable
var wwt;
// Create variables to hold some annotation objects
var circles = [];
// Create variables to hold the changeable settings
var bShowCrosshairs = true;
var bShowUI = true;
var bShowFigures = true;
var bShowAnnotations = true;
var bShowCircles = false;

//$(document).ready(function(){
//$.ajaxSetup({ cache:false });
//});

function returnInfo(info){
	return info;
}

function setUpIdLanding(){
	//$.getJSON('/uvis/id/', function(data){
		//JSONStr = data;
		JSONStr = info;
		console.log(JSONStr);
		directions = JSONStr.head.Directions;
		band = JSONStr.head.Band;
		project = JSONStr.head.Project;
		start = JSONStr.head.Start;
		stop = JSONStr.head.Stop;
		clock = JSONStr.head.Clock;
		sasId = JSONStr.head.SASID;
		var ra, dec = 0;
		initialize(); // Initialize the canvas
		wwt.clearAnnotations(); // Clear previous pointing objects
		circles=[];
		for (var i in directions) {
			if(directions[i][2] != 'J2000') {
				ra = 0;
				dec = 0;
			}
			else{
				ra = directions[i][0] * (180/Math.PI);
				dec = directions[i][1] * (180/Math.PI);
			}
			drawCircle(ra, ra, dec, band, project, 'station'); // SAP pointing(s)
			if (directions[i][3] != undefined){
				tabs = directions[i][3];
				for (var k in tabs) {
					tab_ra = tabs[k][0] * (180/Math.PI);
					tab_dec = tabs[k][1] * (180/Math.PI);
					drawCircle(tab_ra, tab_ra, tab_dec, band, project, 'tab'); // TAB pointing(s)
				}
			}
			wwt.gotoRaDecZoom(ra, dec, 30, false); // Animate and zoom to the (last) pointing in an observing setup
		}
		rah = Math.floor(ra/15);
		ram = Math.floor((ra/15 - rah) * 60); 
		ras = ((((ra/15 - rah) * 60) - ram) * 60).toFixed(1);
		if(dec > 0){
			decd = Math.floor(dec);
		}
		else{
			decd = Math.ceil(dec);
		}
		decm = Math.floor((Math.abs(dec) - Math.abs(decd)) * 60);
		decs = ((((Math.abs(dec) - Math.abs(decd)) * 60) - decm) * 60).toFixed(1);
		// Populate the project info fields
		document.getElementById("timestamp").value = start;
		document.getElementById("project").innerHTML = "Project: <font color='red'>" + project + "<font>";
		document.getElementById("info").innerHTML = "Band: <font color='red'>" + band + "</font> &nbsp;&nbsp; Start: <font color='red'>" + start + "</font> &nbsp;&nbsp; Stop: <font color='red'>" + stop + "</font> &nbsp;&nbsp; Clock: <font color='red'>" + clock + "MHz </font> &nbsp;&nbsp; SAS ID: <font color='red'>" + sasId + "</font> &nbsp;&nbsp; At: <font color='red'>" + rah + "h" + ram + 'm' + ras + 's&nbsp;&nbsp;' + decd + 'd' + decm + 'm' + decs + 's' + "</font>";
	//});
}

// A simple function to toggle the settings
// This function is called from the checkbox entries setup in the html table
function toggleSetting(text){
		switch (text){
			 case 'ShowFigures':
				bShowFigures = !bShowFigures;
				wwt.settings.set_showConstellationFigures(bShowFigures);
				break;
		}
}

// A function to create a circle
function createWWTCircle(fill, lineColor, fillColor, lineWidth, opacity, radius, skyRelative, ra, dec){
	
	var circle = wwt.createCircle(fill);
	circle.set_lineColor(lineColor);
	circle.set_fillColor(fillColor);
	circle.set_lineWidth(lineWidth);
	circle.set_opacity(opacity);
	circle.set_radius(radius);
	circle.set_skyRelative(skyRelative);
	circle.setCenter(ra, dec);

	return circle;
}

function initialize(){
  wwt = wwtlib.WWTControl.initControl("WWTCanvas");
  wwt.add_ready(wwtReady);
  wwt.add_arrived(wwtArrived);
  resize_canvas();
}

// Wrapper to draw the SAP and TAB pointings
function drawCircle(id, ra, dec, band, project, kind){

		if (band == 'LBA'){
			color = "red";
		}
		else if (band == 'HBA'){
			color = "green";
		}
		else{
			color = "yellow";
		}
		if (kind == 'station'){
			circleStat = createWWTCircle(true, color, "gray", 2, 0.2, 2.5, true, ra, dec);
			circleStat.set_id(id);
			circleStat.set_label(project);
			circleStat.set_showHoverLabel(true);
			circles.push(circleStat);
			wwt.addAnnotation(circles[circles.length - 1]);
		}
		else{
			color = "yellow";
			circleTab = createWWTCircle(true, color, "gray", 2, 0.2, 0.1, true, ra, dec);
			circleTab.set_id(id);
			circles.push(circleTab);
			wwt.addAnnotation(circles[circles.length - 1]);
		}
}

function resize_canvas(){
	div = document.getElementById("WWTCanvas");
	if (div.style.width != (window.innerWidth).toString() - 8 + "px"){
		div.style.width = (window.innerWidth).toString() - 8 + "px";
	}
	if (div.style.height != (window.innerHeight).toString() - 145 + "px"){
		div.style.height = ((window.innerHeight)).toString() - 145 + "px";
	}
}
	
// The wwtReady function is called by the WWT Web Control software
// This function sets up the wwt object, and the initial defaults
function wwtReady(){
	wwt.settings.set_showCrosshairs(bShowCrosshairs);
	wwt.settings.set_showConstellationFigures(bShowFigures);
	//wwt.hideUI(!bShowUI);
	wwt.settings.set_showConstellationBoundries(true);
	wwt.settings.set_showGrid(true);
	wwt.settings.set_showEquatorialGridText(true);
	//wwt.settings.set_gridColor("red");   // Transparent red
	wwt.settings.set_locationLat(52.828333);
	wwt.settings.set_locationLng(6.393611);
	wwt.settings.set_locationAltitude(5);
	wwt.settings.set_localHorizonMode(true);
	wwt.settings.set_showHorizon(true);
	//wwt.settings.set_solarSystemCosmos(true);
	//wwt.settings.set_solarSystemLighting(true);
	//wwt.settings.set_showConstellationNames(true);
	//wwt.settings.set_showConstellationLabels(true);
	wwt.settings.set_showConstellations(true);
	//wwt.settings.set_showFieldOfView(true);
	//wwt.settings.set_showUTCTime(true);
	wwt.loadImageCollection("/static/scripts/surveys.wtml");
	wwt.setBackgroundImageByName("Black Sky Background");
	document.getElementById('background').selectedIndex = 7;
}

function wwtArrived(obj, eventArgs){
	//wwt.setBackgroundImageByName("Westerbork Northern Sky Survey (Radio)");
	//document.getElementById('background').selectedIndex = 7;
	changeBackground();
}

function changeBackground(){
	chosen = document.getElementById('background');
	if(chosen.options[chosen.selectedIndex].value == 'DSS'){
		wwt.setBackgroundImageByName("Digitized Sky Survey (Color)");
	}
	else if(chosen.options[chosen.selectedIndex].value == 'VLSS'){
		wwt.setBackgroundImageByName("VLSS: VLA Low-frequency Sky Survey (Radio)");
	}
	else if(chosen.options[chosen.selectedIndex].value == 'SDSS'){
		wwt.setBackgroundImageByName("SDSS: Sloan Digital Sky Survey (Optical)");
	}
	else if(chosen.options[chosen.selectedIndex].value == 'ROSAT'){
		wwt.setBackgroundImageByName("RASS: ROSAT All Sky Survey (X-ray)");
	}
	else if(chosen.options[chosen.selectedIndex].value == 'WENSS'){
		wwt.setBackgroundImageByName("Westerbork Northern Sky Survey (Radio)");
	}
	else if(chosen.options[chosen.selectedIndex].value == 'NVSS'){
		wwt.setBackgroundImageByName("NVSS: NRAO VLA Sky Survey (Radio)");
	}
	else if(chosen.options[chosen.selectedIndex].value == 'FIRST'){
		wwt.setBackgroundImageByName("VLA FIRST: Faint Images of the Radio Sky at Twenty-centimeters");
	}
	else if(chosen.options[chosen.selectedIndex].value == 'Fermi'){
		wwt.setBackgroundImageByName("Fermi Year Three (Gamma)");
	}
	else if(chosen.options[chosen.selectedIndex].value == 'HI'){
		wwt.setBackgroundImageByName("HI All-Sky Continuum Survey (Radio)");
	}
	else if(chosen.options[chosen.selectedIndex].value == 'Planck'){
		wwt.setBackgroundImageByName("Planck CMB");
	}
	else{
		wwt.setBackgroundImageByName("WISE All Sky (Infrared)");
	}
}
