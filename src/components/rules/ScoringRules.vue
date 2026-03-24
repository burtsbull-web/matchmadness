<script setup lang="ts">
</script>

<template>
  <div>
    <div class="rules-grid">
      <div class="rc">
        <h3><span class="rdot" style="background: #FA8D29"></span>HSI Conversion</h3>
        <div class="rrow"><span>Above 2.0%</span><span class="rpts">3 pts</span></div>
        <div class="rrow"><span>Above 2.5%</span><span class="rpts">5 pts</span></div>
        <div class="rrow"><span>3.0% and above</span><span class="rpts">7 pts</span></div>
        <div class="rrow"><span>Each +1% above 3.0%</span><span class="rpts">+2 pts</span></div>
      </div>

      <div class="rc">
        <h3><span class="rdot" style="background: #007573"></span>Postpaid Conversion</h3>
        <div class="rrow"><span>Above 8%</span><span class="rpts">1 pt</span></div>
        <div class="rrow"><span>Above 9%</span><span class="rpts">2 pts</span></div>
        <div class="rrow"><span>Above 10%</span><span class="rpts">3 pts</span></div>
        <div class="rrow"><span>Above 11%</span><span class="rpts">5 pts</span></div>
        <div class="rrow"><span>Above 12%</span><span class="rpts">7 pts</span></div>
        <div class="rrow"><span>Above 13%</span><span class="rpts">9 pts</span></div>
        <div class="rrow"><span>Above 14%</span><span class="rpts">11 pts</span></div>
        <div class="rrow"><span>Above 15%</span><span class="rpts">13 pts</span></div>
        <div class="rrow"><span>Above 16%</span><span class="rpts">15 pts</span></div>
        <div class="rrow"><span>Each +1% above 16%</span><span class="rpts">+2 pts</span></div>
      </div>

      <div class="rc">
        <h3><span class="rdot" style="background: #A8AAAD"></span>Revenue to Goal</h3>
        <div class="rrow"><span>110% of goal</span><span class="rpts">4 pts</span></div>
        <div class="rrow"><span>120% of goal</span><span class="rpts">8 pts</span></div>
        <div class="rrow"><span>130% of goal</span><span class="rpts">12 pts</span></div>
        <div class="rrow"><span>Each +10% above</span><span class="rpts">+4 pts</span></div>
      </div>

      <div class="rc">
        <h3><span class="rdot" style="background: #010101"></span>HSI to Goal</h3>
        <div class="rrow"><span>100% of goal</span><span class="rpts">3 pts</span></div>
        <div class="rrow"><span>110% of goal</span><span class="rpts">5 pts</span></div>
        <div class="rrow"><span>120% of goal</span><span class="rpts">7 pts</span></div>
        <div class="rrow"><span>Each +10% above</span><span class="rpts">+2 pts</span></div>
      </div>
    </div>

    <p class="tiebreaker">Tiebreaker: higher Postpaid Conversion advances.</p>

    <div class="rc lb-rules">
      <h3><span class="rdot" style="background: #E25353"></span>Loser's Bracket</h3>
      <div class="rrow"><span>Who enters</span><span class="rval">First-round (Round of 43) losers</span></div>
      <div class="rrow"><span>Format</span><span class="rval">Single elimination, 5 rounds</span></div>
      <div class="rrow"><span>21 losers</span><span class="rval">10 matches + 1 bye &rarr; 11</span></div>
      <div class="rrow"><span>11 teams</span><span class="rval">5 matches + 1 bye &rarr; 6</span></div>
      <div class="rrow"><span>6 teams</span><span class="rval">3 matches &rarr; 3</span></div>
      <div class="rrow"><span>3 teams</span><span class="rval">1 match + 1 bye &rarr; 2</span></div>
      <div class="rrow"><span>LB Final</span><span class="rval">1 match &rarr; LB Champion</span></div>
      <p class="lb-note">Same scoring rules apply. Tiebreaker: higher Postpaid Conversion.</p>
    </div>
  </div>
</template>

<style scoped>
.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
  max-width: 1100px;
  margin: 0 auto;
}

.rc {
  background: #fff;
  border: 0.5px solid #ddd;
  border-radius: 12px;
  padding: 1rem;
}

.rc h3 {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 9px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rdot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

.rrow {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
  border-bottom: 0.5px solid #eee;
}

.rrow:last-child {
  border-bottom: none;
}

.rpts {
  font-weight: 500;
  color: #FA8D29;
}

.rval {
  font-size: 12px;
  color: #555;
}

.tiebreaker {
  font-size: 12px;
  color: #888;
  margin-top: 1rem;
  text-align: center;
}

.lb-rules {
  max-width: 600px;
  margin: 1.2rem auto 0;
}

.lb-note {
  font-size: 11px;
  color: #888;
  margin-top: 8px;
}
</style>
