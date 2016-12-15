
for i in {3..50}; do 
	wget -nv -O map-$i.json "http://www.bitwise.fi/puzzle/map?seed=$i"
done
