# Serial Protocol #

This protocol is a master-master protocol inspired from HDLC. it's goal is to transport  a CanBus's message and because the size of the message is small we use only one information frame.

## Frame Format ##

1 bytes FRAME\_BOUNDARY
1 byte COMMAND
1 to n bytes INFORMATION
2 bytes CRC
1 byte FRAME\_BOUNDARY

## Different type of frame ##

FRAME\_BOUNDARY always 0x7E

### Information Frame ###

COMMAMD = I\_FRAME\_DATA = 0x00<br>
It's the only frame with 1 to n bytes or information<br>
<br>
<h3>Supervisory Frame</h3>

COMMAND = S_FRAME_RR = 0x11<br>
Message received<br>
<br>
COMMAND = S_FRAME_RNR = 0x15<br>
Problem on the receiver<br>
<br>
COMMAND = S_FRAME_REJ = 0x19<br>
Receiver has rejected the message and asks for resend it<br>
<br>
<h3>Unumbered Frame</h3>

COMMAND = U_FRAME_UA = 0x73<br>
Receiver confirms the connection<br>
<br>
COMMAND = U_FRAME_SABM = 0x3F<br>
Sender asks for a connection<br>
<br>
COMMAND = U_FRAME_DISC = 0x53<br>
sender asks for disconnection<br>
<br>
COMMAND = U_FRAME_DM = 0x1F<br>
connection release<br>
<br>
<h3>send a message</h3>

X sender<br>
Y receiver<br>
<br>
<b>Perfect dialog</b>
<pre><code>X U_FRAME_SABM<br>
  U_FRAME_UA   Y<br>
X I_FRAME_DATA    (containing the message, there is only one I_FRAME_DATA)<br>
  S_FRAME_RR   Y<br>
X S_FRAME_DISC<br>
  U_FRAME_UA   Y<br>
</code></pre>


<b>dialog with error</b>
<pre><code>X U_FRAME_SABM<br>
  U_FRAME_UA   Y<br>
X I_FRAME_DATA    (containing the message, there is only one I_FRAME_DATA)<br>
  S_FRAME_RNR  Y  (problem with message or in buffer for storing it)<br>
X I_FRAME_DATA<br>
  S_FRAME_RR   Y<br>
X S_FRAME_DISC<br>
  U_FRAME_UA   Y<br>
</code></pre>

<b>dialog with collision</b>
<pre><code>X U_FRAME_SABM       Y U_FRAME_SABM<br>
  U_FRAME_DM   Y       U_FRAME_DM    X<br>
X U_FRAME_UA         Y U_FRAME_UA<br>
</code></pre>