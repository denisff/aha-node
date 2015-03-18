# CAN BUS #

There is 2 types of **CAN-ID**<br>
One for network variable <b>NV</b>, NV message are broadcasted<br>
One for explicit message <b>EM</b>, EM message are addressed<br>

<ul><li><b>CAN-ID NV</b>
<pre><code>        28        27       26:16         15       14:0<br>
        CID_PRI   CID_TYP  CID_NODE_SRC  CID_DIR  CID_NV_BND<br>
        1 bit     1 bit    11 bits       1 bit    15 bits<br>
</code></pre>
</li><li><b>CAN-ID EM</b>
<pre><code>        28       27       26:16         15:5          4:0<br>
        CID_PRI  CID_TYP  CID_NODE_SRC  CID_NODE_DST  CID_EM<br>
        1 bit    1 bit    11 bits       11 bits       5 bits<br>
</code></pre>
</li><li><b>CID_PRI</b>	<i>Priority</i>
<pre><code>        CID_PRI_HIGH	0	High priotiry<br>
        CID_PRI_LOW	1	Low priotiry<br>
</code></pre>
</li><li><b>CID_TYP</b>	<i>Message type</i>
<pre><code>        CID_TYP_NV	0	Network variable message<br>
        CID_PRI_EM	1	Explicit message<br>
</code></pre>
</li><li><b>NODE ADDRESS</b>
<pre><code>        CID_NODE_SRC	0-2047	Identifiant du module source du message<br>
        CID_NODE_DST 	0-2047	Identifiant du module destination du message (only for EM message)<br>
</code></pre>
</li><li><b>CID_DIR</b> <i>Message direcion</i>
<pre><code>        CID_DIR_INPUT	0	Input NV<br>
        CID_DIR_OUTPUT 	1	Output NV<br>
</code></pre>
</li><li><b>CID_NV_BND</b>	<i>ID NV binding</i>
<pre><code>        CID_NV_BND	0-16384	Network variable ID binding<br>
</code></pre>
</li><li><b>CID_EM</b>	<i>Explicit message code</i>
<pre><code>        CID_EM		0-31	Explicit message code<br>
<br>
        CID_EM_PING			0x00                      <br>
        CID_EM_WHO_IS_UP		0x01                      <br>
        CID_EM_FIRMWARE_VERSION		0x02                      <br>
        CID_EM_RESET			0x03<br>
        CID_EM_NV_CFG			0x04<br>
<br>
</code></pre>