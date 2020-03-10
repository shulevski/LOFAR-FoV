#!/usr/bin/env python

from flask import Flask, render_template, send_from_directory, url_for, request, redirect
import numpy as np
from json import JSONEncoder
from lofar.sas.otdb.OTDBBusListener import OTDBBusListener
from lofar.sas.resourceassignment.ratootdbtaskspecificationpropagator.otdbrpc import OTDBRPC
from lofar.sas.otdb.config import DEFAULT_OTDB_NOTIFICATION_BUSNAME as OTDB_BUSNAME
from lofar.sas.otdb.config import DEFAULT_OTDB_NOTIFICATION_SUBJECT as OTDB_SERVICENAME
from lofar.sas.otdb.config import DEFAULT_OTDB_SERVICE_BUSNAME as OTDB_RPC_BUSNAME
from lofar.sas.otdb.config import DEFAULT_OTDB_SERVICENAME as OTDB_RPC_SERVICENAME

from lofar.common.util import waitForInterrupt
from lofar.parameterset import parameterset

import qpid.messaging
import logging
import json

logger = logging.getLogger(__name__)

class ASOTDBBusListener(OTDBBusListener):
	def __init__(self, busname, servicename, broker):
		super(ASOTDBBusListener, self).__init__(busname, servicename, broker)
		self.otdbrpc = OTDBRPC(busname=OTDB_RPC_BUSNAME, servicename=OTDB_RPC_SERVICENAME, broker=self.broker)

	def onObservationStarted(self, treeId, modificationTime):
		logger.info("onObservationStarted(%s, %s)" % (treeId, modificationTime))
		
		try:
			result = self.otdbrpc.taskGetSpecification(otdb_id=treeId)
			spec = result['specification']
			writeJSON(spec, '/opt/lofarvis/userVis/static/scripts/', 'lofar.json')
			
		except Exception as e:
			logger.error(str(e))
			
def getSpecAsJson(treeId):
	logger.info("getSpecAsJson(%s)" % treeId)
	
	try:
		with OTDBRPC(busname=OTDB_RPC_BUSNAME, servicename=OTDB_RPC_SERVICENAME, broker='<lofar_broker_address>') as otdbrpc:
			result = otdbrpc.taskGetSpecification(otdb_id=treeId)
			spec = result['specification']
			return specToJSON(spec)		
	except Exception as e:
		logger.error(str(e))

def getSpecAndWriteJson(treeId):
	logger.info("getSpecAndWriteJson(%s)" % treeId)
	
	try:
		with OTDBRPC(busname=OTDB_RPC_BUSNAME, servicename=OTDB_RPC_SERVICENAME, broker='<lofar_broker_address>') as otdbrpc:
			result = otdbrpc.taskGetSpecification(otdb_id=treeId)
			spec = result['specification']
			writeJSON(spec, '/opt/lofarvis/userVis/static/scripts/', 'lofarId.json')
		
	except Exception as e:
		logger.error(str(e))

def writeJSON(data, path, filename):
#def writeJSON(treeId):
	
	'''
	### Test ###
	try:
		otdbrpc = OTDBRPC(busname=OTDB_RPC_BUSNAME, servicename=OTDB_RPC_SERVICENAME, broker='<lofar_broker_address>')
		result = otdbrpc.taskGetSpecification(otdb_id=treeId)
		data = result['specification']
	### test ###
	'''
	try:
		if data != None:
			f = open(path + filename, 'w')
			f.write(specToJSON(data))
			f.close()
			logger.info("Written file")
	except Exception as e:
		logger.error(str(e))

def specToJSON(data):
	try:
		parset = parameterset(data)
		
		jsonStr = {}
		head = {}
		directions = {}
		tabs = {}
		#for key in sorted(data):
			#print key, ' ---> ', data[key]
		
		if parset.getString('ObsSW.Observation.processType') == 'Observation':
			projectId = parset.getString('ObsSW.Observation.Campaign.name')
			logger.info("Project ID: " + projectId)
			
			for sap_nr in xrange(parset.getInt('ObsSW.Observation.nrBeams')):
				logger.info("checking SAP {}".format(sap_nr))
				RA = parset.getString('ObsSW.Observation.Beam[%d].angle1' % sap_nr)
				DEC = parset.getString('ObsSW.Observation.Beam[%d].angle2' % sap_nr)
				logger.info("RA: " + RA)
				logger.info("DEC: " + DEC)
				coordSys = parset.getString('ObsSW.Observation.Beam[%d].directionType' % sap_nr)
				logger.info("Coordinate system: " + coordSys)
				if parset.getInt('ObsSW.Observation.Beam[%d].nrTiedArrayBeams' % sap_nr) > 0:
					logger.info("Number TABs: " + str(parset.getInt('ObsSW.Observation.Beam[%d].nrTiedArrayBeams' % sap_nr)))
					for tab_nr in xrange(parset.getInt('ObsSW.Observation.Beam[%d].nrTiedArrayBeams' % sap_nr)):
						tab_ra = parset.getString('ObsSW.Observation.Beam[%d].TiedArrayBeam[%d].angle1' % (sap_nr, tab_nr))
						logger.info("TAB RA: " + parset.getString('ObsSW.Observation.Beam[%d].TiedArrayBeam[%d].angle1' % (sap_nr, tab_nr)))
						tab_dec = parset.getString('ObsSW.Observation.Beam[%d].TiedArrayBeam[%d].angle2' % (sap_nr, tab_nr))
						logger.info("TAB DEC: " + parset.getString('ObsSW.Observation.Beam[%d].TiedArrayBeam[%d].angle2' % (sap_nr, tab_nr)))
						tab_coordSys = parset.getString('ObsSW.Observation.Beam[%d].TiedArrayBeam[%d].directionType' % (sap_nr, tab_nr))
						logger.info("TAB System: " + parset.getString('ObsSW.Observation.Beam[%d].TiedArrayBeam[%d].directionType' % (sap_nr, tab_nr)))
						if float(tab_ra) + float(tab_dec) != 0.:
							tabs[str(tab_nr)] = [tab_ra, tab_dec, tab_coordSys]
						else:
							continue
					directions[str(sap_nr)] = [RA, DEC, coordSys, tabs]
					tabs = {}
				else:
					directions[str(sap_nr)] = [RA, DEC, coordSys]
			obsStartTime = parset.getString('ObsSW.Observation.startTime')
			logger.info("Start time: " + obsStartTime)
			obsStopTime = parset.getString('ObsSW.Observation.stopTime')
			logger.info("Stop time: " + obsStopTime)
			obsMode = parset.getString('ObsSW.Observation.antennaArray')
			logger.info("Mode: " + obsMode)
			clock = parset.getString('ObsSW.Observation.sampleClock')
			logger.info("Clock: " + clock + "MHz")
			sasId = parset.getString('ObsSW.Observation.otdbID')
			logger.info("SAS ID: " + sasId)
			head['Project'] = projectId
			head['Directions'] = directions
			head['Start'] = obsStartTime
			head['Stop'] = obsStopTime
			head['Band'] = obsMode
			head['Clock'] = clock
			head['SASID'] = sasId
			jsonStr['head'] = head

			return json.dumps(jsonStr)
		else:
			logger.info("Received a pipeline parset; continuing to listen for observation started.")

	except Exception as e:
		logger.error(str(e))


app = Flask(__name__)

@app.route('/uvis/id/', methods=['POST', 'GET'])
def visId():
	if request.method == 'POST':
		if request.form['sasId'] != None and request.form['sasId'] != "":
			getSpecAndWriteJson(int(request.form['sasId']))
	return render_template('fovId.html')

@app.route('/uvis/id/<int:sas_id>', methods=['GET'])
def getSpecAsJsonUrl(sas_id):
	jsonStr = getSpecAsJson(sas_id)
	return render_template('fovLanding.html', info=jsonStr)
	
@app.route('/uvis/static/<path:path>')
def send_js(path):
	return send_from_directory('static', path)


@app.route('/uvis/')
def fov():
	return render_template('index.html')

if __name__ == "__main__":
	
	logging.basicConfig(level=logging.INFO)

	with ASOTDBBusListener(busname=OTDB_BUSNAME, servicename=OTDB_SERVICENAME, broker='<lofar_broker_address>'):
		app.run(host='0.0.0.0')
		#app.run(debug=True)
		
	#app.run(debug=True)
	#app.run()
	#app.run(host='0.0.0.0')
