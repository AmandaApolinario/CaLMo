<template>
  <div class="getting-started-container">
    <NavBar />
    <div class="getting-started-content">
      <h1>Getting Started with CaLMo 2.0</h1>
      
      <!-- Introduction Section -->
      <section class="gs-section">
        <h2>What are Causal Loop Diagrams?</h2>
        <p>
          Causal Loop Diagrams (CLDs) are visual tools that help you understand how different variables in a system 
          influence each other. They show cause-and-effect relationships and help identify feedback loops that 
          drive system behavior over time.
        </p>
        
        <!-- Simple CLD Example -->
        <div class="cld-example">
          <h3>Simple CLD Example</h3>
          <div class="diagram-container">
            <div class="diagram">
              <div class="variable var1">Exercise</div>
              <div class="variable var2">Fitness</div>
              <div class="variable var3">Motivation</div>
              
              <!-- Arrow from Exercise to Fitness -->
              <svg class="arrow-svg">
                <defs>
                  <marker id="arrowhead1" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#2c3e50" />
                  </marker>
                </defs>
                <path d="M215,70 L290,160" stroke="#2c3e50" stroke-width="2" marker-end="url(#arrowhead1)" />
                <circle cx="252" cy="115" r="12" fill="white" stroke="#e2e8f0" stroke-width="1" />
                <text x="252" y="120" text-anchor="middle" fill="#42b983" font-weight="bold">+</text>
              </svg>
              
              <!-- Arrow from Fitness to Motivation -->
              <svg class="arrow-svg">
                <defs>
                  <marker id="arrowhead2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#2c3e50" />
                  </marker>
                </defs>
                <path d="M250,180 L180,180" stroke="#2c3e50" stroke-width="2" marker-end="url(#arrowhead2)" />
                <circle cx="215" cy="180" r="12" fill="white" stroke="#e2e8f0" stroke-width="1" />
                <text x="215" y="185" text-anchor="middle" fill="#42b983" font-weight="bold">+</text>
              </svg>
              
              <!-- Arrow from Motivation to Exercise -->
              <svg class="arrow-svg">
                <defs>
                  <marker id="arrowhead3" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#2c3e50" />
                  </marker>
                </defs>
                <path d="M150,160 L190,70" stroke="#2c3e50" stroke-width="2" marker-end="url(#arrowhead3)" />
                <circle cx="170" cy="115" r="12" fill="white" stroke="#e2e8f0" stroke-width="1" />
                <text x="170" y="120" text-anchor="middle" fill="#42b983" font-weight="bold">+</text>
              </svg>
            </div>
            <p class="diagram-caption">
              A reinforcing feedback loop: More exercise leads to increased fitness, which increases motivation, 
              which in turn leads to more exercise.
            </p>
          </div>
        </div>
      </section>
      
      <!-- Key Concepts Section -->
      <section class="gs-section">
        <h2>Key Concepts in Causal Loop Diagrams</h2>
        
        <div class="concept-grid">
          <div class="concept-card">
            <h3>Variables</h3>
            <p>Variables are factors in your system that can increase or decrease. They are represented as text in your diagram.</p>
            <p><strong>Examples:</strong> Customer Satisfaction, Product Quality, Revenue, Employee Morale, etc.</p>
          </div>
          
          <div class="concept-card">
            <h3>Causal Relationships</h3>
            <p>Links between variables showing how one affects another, represented by arrows.</p>
            <ul>
              <li><strong>Positive (+):</strong> When variable A increases, variable B also increases (or when A decreases, B decreases).</li>
              <li><strong>Negative (-):</strong> When variable A increases, variable B decreases (or when A decreases, B increases).</li>
            </ul>
          </div>
          
          <div class="concept-card">
            <h3>Feedback Loops</h3>
            <p>Circular chains of cause and effect that create system behavior patterns.</p>
            <ul>
              <li><strong>Reinforcing Loops (R):</strong> Amplify change in one direction (growth or decline)</li>
              <li><strong>Balancing Loops (B):</strong> Counteract change and create stability or oscillation</li>
            </ul>
          </div>
        </div>
      </section>
      
      <!-- Applications Section -->
      <section class="gs-section">
        <h2>Applications of CLDs</h2>
        
        <div class="application-grid">
          <div class="application-card">
            <h3>Business</h3>
            <ul>
              <li>Market dynamics and competition</li>
              <li>Product development cycles</li>
              <li>Customer acquisition and retention</li>
              <li>Organizational change management</li>
              <li>Supply chain optimization</li>
            </ul>
          </div>
          
          <div class="application-card">
            <h3>Environment</h3>
            <ul>
              <li>Ecosystem management</li>
              <li>Resource conservation</li>
              <li>Climate change impacts</li>
              <li>Pollution dynamics</li>
              <li>Sustainable development planning</li>
            </ul>
          </div>
          
          <div class="application-card">
            <h3>Social Systems</h3>
            <ul>
              <li>Policy development and evaluation</li>
              <li>Public health intervention planning</li>
              <li>Urban development</li>
              <li>Educational system improvement</li>
              <li>Community dynamics</li>
            </ul>
          </div>
          
          <div class="application-card">
            <h3>Personal</h3>
            <ul>
              <li>Habit formation and behavior change</li>
              <li>Goal achievement and planning</li>
              <li>Personal productivity systems</li>
              <li>Relationship dynamics</li>
              <li>Work-life balance</li>
            </ul>
          </div>
        </div>
      </section>
      
      <!-- How To Use Section -->
      <section class="gs-section">
        <h2>How To Use CaLMo 2.0</h2>
        
        <div class="steps-container">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>Create Variables</h3>
              <p>Start by defining the key variables in your system. Go to the "Variables" section and create all the factors that might influence your system.</p>
              <ul>
                <li>Choose clear, concise names</li>
                <li>Add descriptions to document what each variable represents</li>
                <li>Consider both quantitative and qualitative factors</li>
              </ul>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>Create a CLD</h3>
              <p>Go to "Create CLD" to start building relationships between your variables.</p>
              <ul>
                <li>Give your CLD a descriptive name</li>
                <li>Add relationships by selecting source and target variables</li>
                <li>Determine if each relationship is positive (+) or negative (-)</li>
                <li>Build your diagram one relationship at a time</li>
              </ul>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>Analyze Your CLD</h3>
              <p>View your completed CLD to identify feedback loops and patterns.</p>
              <ul>
                <li>Look for reinforcing and balancing loops</li>
                <li>Identify leverage points where small changes might have big effects</li>
                <li>Look for common system archetypes</li>
              </ul>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">4</div>
            <div class="step-content">
              <h3>Refine and Share</h3>
              <p>Continually improve your CLD and use it to communicate insights.</p>
              <ul>
                <li>Add or remove variables as your understanding improves</li>
                <li>Modify relationships based on new information</li>
                <li>Use your CLD to explain system behavior to others</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      <div class="return-dashboard">
        <button @click="returnToDashboard" class="btn-return">Return to Dashboard</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import NavBar from '../components/NavBar.vue'

const router = useRouter()

const returnToDashboard = () => {
  router.push('/dashboard')
}

// Ensure the page scrolls to the top when loaded
onMounted(() => {
  window.scrollTo(0, 0)
})
</script>

<style scoped>
.getting-started-container {
  background-color: #f5f7fa;
  min-height: 100vh;
}

.getting-started-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  color: #1a252f;
  margin-bottom: 2rem;
  text-align: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.gs-section {
  background-color: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.gs-section h2 {
  font-size: 1.6rem;
  color: #1a252f;
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.gs-section p {
  line-height: 1.7;
  color: #4a5568;
}

/* CLD Example Styles */
.cld-example {
  margin: 2rem auto;
  max-width: 500px;
}

.cld-example h3 {
  font-size: 1.3rem;
  color: #1a252f;
  margin-bottom: 1rem;
  font-weight: 600;
  text-align: center;
}

.diagram-container {
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.diagram {
  position: relative;
  height: 220px;
  margin-bottom: 1rem;
}

.variable {
  position: absolute;
  background-color: #42b983;
  color: white;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  text-align: center;
  min-width: 100px;
  z-index: 2;
}

.var1 {
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.var2 {
  bottom: 20px;
  right: 70px;
}

.var3 {
  bottom: 20px;
  left: 70px;
}

.arrow-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.diagram-caption {
  text-align: center;
  color: #4a5568;
  line-height: 1.6;
  margin: 0;
  font-size: 0.95rem;
}

/* Concepts Grid */
.concept-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.concept-card {
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

.concept-card h3 {
  font-size: 1.2rem;
  color: #42b983;
  margin-bottom: 1rem;
  font-weight: 600;
}

.concept-card p, .concept-card ul {
  color: #4a5568;
  line-height: 1.6;
}

.concept-card ul {
  padding-left: 1.5rem;
  margin-top: 0.5rem;
}

.concept-card li {
  margin-bottom: 0.5rem;
}

/* Applications Grid - Fixed 2x2 Layout */
.application-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
}

.application-card {
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

.application-card h3 {
  font-size: 1.2rem;
  color: #42b983;
  margin-bottom: 1rem;
  font-weight: 600;
  text-align: left;
}

.application-card ul {
  color: #4a5568;
  line-height: 1.6;
  text-align: left;
}

.application-card li {
  margin-bottom: 0.5rem;
}

/* Steps Styles */
.steps-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step {
  display: flex;
  gap: 1.5rem;
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  text-align: left;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #42b983;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  min-width: 50px;
  height: 50px;
  border-radius: 50%;
}

.step-content {
  flex: 1;
  text-align: left;
}

.step-content h3 {
  font-size: 1.2rem;
  color: #1a252f;
  margin-bottom: 0.5rem;
  font-weight: 600;
  text-align: left;
}

.step-content p {
  margin-bottom: 0.8rem;
  text-align: left;
}

.step-content ul {
  padding-left: 1.5rem;
}

.step-content li {
  margin-bottom: 0.5rem;
  color: #4a5568;
}

.return-dashboard {
  text-align: center;
  margin: 2rem 0;
}

.btn-return {
  background-color: #42b983;
  color: white;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-return:hover {
  background-color: #3aa876;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .step {
    flex-direction: column;
    gap: 1rem;
  }
  
  .step-number {
    align-self: flex-start;
  }
  
  .application-grid {
    grid-template-columns: 1fr;
  }
}
</style> 