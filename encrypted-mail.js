

/*<![CDATA[*/
/**
***********************************************************
****              Mail Harvesting Protection.
****       This script and its generator developed by
****             (c) 2009-2021 Ton van Hattum
****               www.tonvanhattum.com.br/
****        To encipher your email, for free, visit:
****     https://tonvanhattum.com.br/email_encrypter.php
****           Please leave this message intact.
***********************************************************
**/

var mkvur='';
var mkirst='';
var mkdan='';
var mkdrtss='';
var mknt='';

	var vur=[72,109,44,116,126,113,114,73,46,121,109,117,120,128,123,70]
	var irst=[135,122,127,116,118,127,133,63,127,114,117,128,125,125]
	var dan=[80,119,125,113,121,124,62,115,127,125]
	var drtusse=[44,72]
	var ent=[69,56,106,71]


	var sl3=17
	var sl5=9
	var sl6=10
	var sl8=12
	var sl9=16

	for (var i=0; i<vur.length; i++)
		mkvur+=String.fromCharCode(vur[i]-sl8)
	for (var i=0; i<irst.length; i++)
		mkirst+=String.fromCharCode(irst[i]-sl3)
	for (var i=0; i<dan.length; i++)
		mkdan+=String.fromCharCode(dan[i]-sl9)
	for (var i=0; i<drtusse.length; i++)
		mkdrtss+=String.fromCharCode(drtusse[i]-sl6)
	for (var i=0; i<ent.length; i++)
		mknt+=String.fromCharCode(ent[i]-sl5)
document.write(mkvur+mkirst+mkdan+mkdrtss+mkirst+mkdan+mknt);

/*]]>*/


