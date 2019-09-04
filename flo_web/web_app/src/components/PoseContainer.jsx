import React, { useEffect, useState } from 'react';
import * as ROSLIB from 'roslib';
import PropTypes from 'prop-types';

const poseProp = PropTypes.shape({
  description: PropTypes.string,
  joint_names: PropTypes.array,
  joint_positions: PropTypes.array,
});

function Pose({ pose, addToMoveList }) {
  return (
    <button type="button" onClick={() => { addToMoveList(pose); }}>
      {pose.pose.description}
    </button>
  );
}

Pose.propTypes = {
  pose: PropTypes.shape({
    pose: poseProp,
    id: PropTypes.number,
  }).isRequired,
  addToMoveList: PropTypes.func.isRequired,
};


// Takes a parameter ros, which is the connection to ros
function PoseContainer({ ros, connected, addToMoveList }) {
  const [PosesList, setPosesList] = useState([]);
  const [showSave, setShowSave] = useState(false);
  const [saveLR, setSaveLR] = useState('right');
  const [saveID, setSaveID] = useState(0);
  const [saveDescription, setSaveDescription] = useState('');
  const [pose, setPose] = useState(null);
  const [poseListener, setPoseListener] = useState(null);
  const [setPoseSrv, setSetPoseSrv] = useState(null);

  // get all of the poses
  useEffect(() => {
    if (!connected) return;

    const searchPosesClient = new ROSLIB.Service({
      ros,
      name: '/search_pose',
      serviceType: 'flo_core/SearchPose',
    });

    const request = new ROSLIB.ServiceRequest({ search: '' });

    searchPosesClient.callService(request, (resp) => {
      const poses = [];
      for (let i = 0; i < resp.ids.length; i += 1) {
        poses.push({ id: resp.ids[i], pose: resp.poses[i] });
      }
      setPosesList(poses);
    });


    // TODO: Figure out how to clean up pose listener
    // poseListener.unsubscribe();
    // setPoseListener(null);
    const poseListenerT = new ROSLIB.Topic({
      ros,
      name: 'joint_states',
      messageType: 'sensor_msgs/JointState',
    });
    poseListenerT.subscribe((msg) => {
      setPose(msg);
    });
    setPoseListener(poseListenerT);


    const setPoseSrvT = new ROSLIB.Service({
      ros,
      name: '/set_pose',
      serviceType: 'flo_core/SetPose',
    });
    setSetPoseSrv(setPoseSrvT);
  }, [connected, ros]);


  return (
    <div
      id="poses-container"
      style={{
        maxWidth: '150px', backgroundColor: 'white', borderRadius: '25px', padding: '10px', margin: '10px',
      }}
    >
      <h2>Poses:</h2>


      <button type="button" onClick={() => { setShowSave(true); }} disabled={!connected}>Save Pose</button>
      {showSave
        && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, background: 'rgba(0,0,0,.3)', display: 'flex', justifyContent: 'center', alignItems: 'center',
        }}
        >
          <div style={{
            width: '200px', background: 'white', borderRadius: '10px', minWidth: '500px', position: 'relative', textAlign: 'center', display: 'flex', flexDirection: 'column',
          }}
          >
            <h3>Save a New Pose or Overwrite an Existing One</h3>
            <label htmlFor="saveLRButton">
Arm to save:
              <button id="saveLRButton" type="button" onClick={() => { saveLR === 'right' ? setSaveLR('left') : setSaveLR('right'); }}>{saveLR}</button>
              {' '}
            </label>
            <label htmlFor="savePoseIDSelector">
Save As:
              <select
                id="savePoseIDSelector"
                onChange={(obj) => {
                  setSaveID(obj.target.value);
                  if (saveID > 0) {
                    const newDesc = obj.target[obj.target.selectedIndex].textContent;
                    setSaveDescription(newDesc);
                  }
                }}
              >
                <option value="0">New Pose</option>
                {
                PosesList.map((value) => (
                  <option value={value.id}>{value.pose.description}</option>
                ))
                }

              </select>
            </label>
            <label htmlFor="savePoseDescription">
                Description:
              <input type="text" value={saveDescription} onChange={(obj) => { setSaveDescription(obj.target.value); }} />
            </label>

            <button
              type="button"
              disabled={
                    !connected || !saveDescription
}
              onClick={() => {
                const jointsOfIterest = [];
                const cleanNames = [];
                const pos = [];
                for (let idx = 0; idx < pose.name.length; idx += 1) {
                  if (pose.name[idx].includes(saveLR)) {
                    jointsOfIterest.push(idx);
                    cleanNames.push(pose.name[idx].slice(saveLR.length + 1));
                    pos.push(pose.position[idx]);
                  }
                }
                const newPose = {
                  description: saveDescription,
                  joint_names: cleanNames,
                  joint_positions: pos,
                };
                const req = new ROSLIB.ServiceRequest({
                  pose: newPose,
                  id: saveID,
                });

                setPoseSrv.callService(req, (res) => {
                  const targetId = PosesList.findIndex((item) => (item.id === res.id));
                  const PosesListT = [...PosesList];
                  if (targetId === -1) {
                    PosesListT.push({
                      id: res.id,
                      pose: newPose,
                    });
                  } else { PosesListT[targetId] = { id: res.id, pose: newPose }; }
                  setPosesList(PosesListT);
                  setShowSave(false);
                  setSaveID(0);
                  setSaveDescription('');
                });


                // ros serve save id
              }}
            >
Save
            </button>
            <button type="button" onClick={() => { setShowSave(false); }}>Cancel</button>
          </div>
        </div>
        )}


      <div style={{
        display: 'flex', flexDirection: 'column', overflow: 'auto', maxHeight: '400px',
      }}
      >
        {
                PosesList.map((value) => (
                  <Pose
                    id={value.id}
                    pose={value}
                    addToMoveList={addToMoveList}
                  />
                ))
            }
      </div>
    </div>
  );
}

PoseContainer.defaultProps = {
  ros: null,
};

PoseContainer.propTypes = {
  ros: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  connected: PropTypes.bool.isRequired,
  addToMoveList: PropTypes.func.isRequired,
};


export default PoseContainer;