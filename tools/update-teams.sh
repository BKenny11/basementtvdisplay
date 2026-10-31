#!/bin/sh
# Rebuilds teams/*.json, the team directory the display uses to match names typed in the
# sheet's Teams tab ("Bills", "BUF") to ESPN team IDs, colors and logos. Run it when a league
# adds or renames teams. ESPN's teams endpoint doesn't allow browser requests, which is why
# this lives in the repo instead of being fetched live.
set -e
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
for kv in nfl=football/nfl nba=basketball/nba wnba=basketball/wnba mlb=baseball/mlb nhl=hockey/nhl \
  college-football=football/college-football mens-college-basketball=basketball/mens-college-basketball \
  mls=soccer/usa.1 premier-league=soccer/eng.1; do
  key=${kv%%=*}; path=${kv#*=}
  curl -sf "https://site.api.espn.com/apis/site/v2/sports/$path/teams?limit=2000" -o "$tmp/$key.json"
done
ruby -rjson -e '
Dir[File.join(ARGV[0], "*.json")].sort.each do |f|
  key = File.basename(f, ".json")
  teams = JSON.parse(File.read(f))["sports"][0]["leagues"][0]["teams"].map do |t|
    t = t["team"]
    { "id" => t["id"], "abbr" => t["abbreviation"], "name" => t["displayName"], "short" => t["shortDisplayName"],
      "nick" => t["name"], "loc" => t["location"], "color" => t["color"], "alt" => t["alternateColor"],
      "logo" => ((t["logos"] || [])[0] || {})["href"] }.reject { |_, v| v.nil? || v == "" }
  end
  File.write("teams/#{key}.json", JSON.generate(teams))
  puts "#{key}: #{teams.size} teams"
end' "$tmp"
rm -rf "$tmp"
