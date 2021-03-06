#!/usr/bin/env python

# must install serial_coms from FLO_HEAD/teensy/src/seserial_coms/computer/python

import math
import rospy
# https://github.com/Rehab-Robotics-Lab/serial_coms/tree/master/computer/python/serial_coms
from serial_coms import SerialCom
from flo_face_defs.msg import FaceState


class FaceComs(object):
    """This class handles communicating with the face, given a state to send, it
    will send it over the serial communciation line"""

    def __init__(self):
        """Construct node, open serial port, prep to receive commands"""
        rospy.init_node('face_com_manager')
        self.port = rospy.get_param('port', '/dev/flo_face')
        self.coms = SerialCom(self.port, self.data_handler)
        self.past_state = FaceState()
        self.command_receipt = rospy.Subscriber(
            'face_state', FaceState, self.new_command)
        rospy.loginfo('started node, connected to face')
        rospy.spin()

    def new_command(self, msg):
        """Send info from command to microcontroller"""
        if not self.past_state.mouth == msg.mouth:
            self.coms.sendData([0] + self.bytize(msg.mouth))
        if not self.past_state.right_eye == msg.right_eye:
            self.coms.sendData([1] + self.bytize(msg.right_eye))
        if not self.past_state.left_eye == msg.left_eye:
            self.coms.sendData([2] + self.bytize(msg.left_eye))
        if not self.past_state.mouth_brightness == msg.mouth_brightness:
            self.coms.sendData([3, msg.mouth_brightness])
        if not self.past_state.right_eye_brightness == msg.right_eye_brightness:
            self.coms.sendData([4, msg.right_eye_brightness])
        if not self.past_state.left_eye_brightness == msg.left_eye_brightness:
            self.coms.sendData([5, msg.left_eye_brightness])

        self.past_state = msg

    @staticmethod
    def bytize(flat_data):
        """Turn data into individual bytes"""
        # flat_data = flatten(data)
        try:
            len(flat_data)
        except TypeError:
            flat_data = [flat_data]

        data_bytes = [0]*int(math.ceil(len(flat_data)/8))
        for i, _ in enumerate(data_bytes):
            for j in range(8):
                data_bytes[i] = data_bytes[i] | (flat_data[i*8 + j] << (7-j))
        return data_bytes

    @staticmethod
    def data_handler(*data):
        """Receive information from microcontroller and log it"""
        rospy.logdebug("received as ints:")
        rospy.logdebug(data)
        rospy.logdebug("received as string (may be nonsense):")
        rospy.logdebug("".join(map(chr, data)))


if __name__ == '__main__':
    FaceComs()
