const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');
const { OpenAI } = require('openai');
const path = require('path');
require('dotenv').config();
const axios = require('axios');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Initialize Unsplash
const unsplash = require('unsplash-js').createApi({
    accessKey: process.env.UNSPLASH_API_KEY
});

// Debug: Check if .env is loaded
console.log('Environment check on startup:', {
    hasHuggingFaceKey: !!process.env.HUGGINGFACE_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasUnsplashKey: !!process.env.UNSPLASH_API_KEY,
    envPath: path.join(__dirname, '.env')
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Architectural terms for better classification
const architecturalTerms = {
    styles: [
        'modern', 'contemporary', 'minimalist', 'brutalist', 'postmodern',
        'art deco', 'gothic', 'classical', 'neoclassical', 'romanesque',
        'baroque', 'victorian', 'industrial', 'scandinavian', 'japanese',
        'traditional', 'vernacular', 'high-tech', 'deconstructivist', 'organic'
    ],
    elements: [
        'facade', 'roof', 'wall', 'window', 'door', 'column', 'beam',
        'arch', 'dome', 'vault', 'staircase', 'balcony', 'terrace',
        'courtyard', 'atrium', 'skylight', 'canopy', 'overhang',
        'entrance', 'exit', 'ramp', 'elevator', 'escalator', 'bridge',
        'tower', 'spire', 'minaret', 'gallery', 'corridor', 'passage'
    ],
    materials: [
        'concrete', 'steel', 'glass', 'wood', 'stone', 'brick', 'metal',
        'aluminum', 'copper', 'bronze', 'marble', 'granite', 'timber',
        'composite', 'ceramic', 'terracotta', 'corten steel', 'zinc',
        'titanium', 'gold', 'silver', 'plaster', 'stucco', 'masonry'
    ],
    features: [
        'sustainable', 'green roof', 'solar panels', 'rainwater harvesting',
        'natural ventilation', 'daylighting', 'thermal mass', 'passive design',
        'adaptive reuse', 'modular', 'prefabricated', 'parametric design',
        'smart building', 'biophilic design', 'zero energy', 'net zero',
        'LEED certified', 'energy efficient', 'water efficient', 'recycled materials'
    ],
    spaces: [
        'interior', 'exterior', 'public space', 'private space', 'circulation',
        'lobby', 'foyer', 'gallery', 'exhibition space', 'workshop',
        'studio', 'office', 'residential', 'commercial', 'cultural',
        'educational', 'institutional', 'religious', 'recreational', 'industrial',
        'retail', 'hospitality', 'transportation', 'infrastructure'
    ],
    characteristics: [
        'openness', 'transparency', 'fluidity', 'solidity', 'lightness',
        'heaviness', 'simplicity', 'complexity', 'symmetry', 'asymmetry',
        'rhythm', 'repetition', 'contrast', 'harmony', 'balance',
        'proportion', 'scale', 'hierarchy', 'unity', 'diversity'
    ],
    vibes: [
        'biophilic', 'organic', 'natural', 'artificial', 'industrial',
        'luxurious', 'minimal', 'cozy', 'grand', 'intimate',
        'dynamic', 'static', 'welcoming', 'imposing', 'serene',
        'energetic', 'calm', 'dramatic', 'subtle', 'bold'
    ]
};

// Hugging Face API endpoint
app.post('/analyze', multer().single('image'), async (req, res) => {
    try {
        const inputCritique = req.body.critique;
        const inputConcept = req.body.concept;
        const inputLanguage = req.body.language || 'en';

        if (!inputCritique) {
            return res.status(400).json({ error: 'No critique provided' });
        }

        // Get image tags if image is provided
        let imageTags = {
            styles: [],
            elements: [],
            materials: [],
            features: [],
            spaces: [],
            characteristics: [],
            vibes: []
        };

        if (req.file) {
            const imageBuffer = req.file.buffer;
            const imageBase64 = imageBuffer.toString('base64');
            
            console.log('Sending image to Hugging Face API...');
            const imageResponse = await fetch(
                "https://api-inference.huggingface.co/models/facebook/detr-resnet-101",
                {
                    headers: {
                        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({
                        inputs: `data:image/jpeg;base64,${imageBase64}`
                    }),
                }
            );

            if (imageResponse.ok) {
                const imageResult = await imageResponse.json();
                console.log('Raw Hugging Face API Response:', JSON.stringify(imageResult, null, 2));
                
                // Extract tags from the image analysis
                const tags = Array.isArray(imageResult) ? imageResult.map(item => item.label.toLowerCase()) : [];
                console.log('Extracted tags:', tags);
                
                // Add some common architectural terms based on the detected objects
                const additionalTags = new Set();
                tags.forEach(tag => {
                    // Map detected objects to architectural terms
                    if (tag.includes('building') || tag.includes('structure') || tag.includes('architecture')) {
                        additionalTags.add('modern');
                        additionalTags.add('contemporary');
                        additionalTags.add('building');
                    }
                    if (tag.includes('glass') || tag.includes('window') || tag.includes('transparent')) {
                        additionalTags.add('glass');
                        additionalTags.add('transparency');
                        additionalTags.add('window');
                    }
                    if (tag.includes('concrete') || tag.includes('stone') || tag.includes('brick')) {
                        additionalTags.add('concrete');
                        additionalTags.add('solidity');
                        additionalTags.add('stone');
                    }
                    if (tag.includes('wood') || tag.includes('timber') || tag.includes('natural')) {
                        additionalTags.add('wood');
                        additionalTags.add('natural');
                        additionalTags.add('timber');
                    }
                    if (tag.includes('metal') || tag.includes('steel') || tag.includes('industrial')) {
                        additionalTags.add('metal');
                        additionalTags.add('industrial');
                        additionalTags.add('steel');
                    }
                    if (tag.includes('arch') || tag.includes('vault') || tag.includes('curve')) {
                        additionalTags.add('arch');
                        additionalTags.add('vault');
                        additionalTags.add('curved');
                    }
                    if (tag.includes('column') || tag.includes('pillar') || tag.includes('vertical')) {
                        additionalTags.add('column');
                        additionalTags.add('classical');
                        additionalTags.add('pillar');
                    }
                    if (tag.includes('space') || tag.includes('room') || tag.includes('interior')) {
                        additionalTags.add('interior');
                        additionalTags.add('space');
                        additionalTags.add('room');
                    }
                    if (tag.includes('light') || tag.includes('bright') || tag.includes('sun')) {
                        additionalTags.add('daylighting');
                        additionalTags.add('bright');
                        additionalTags.add('light');
                    }
                });

                // Add some default architectural terms if no specific ones were detected
                if (additionalTags.size === 0) {
                    additionalTags.add('modern');
                    additionalTags.add('contemporary');
                    additionalTags.add('building');
                }

                // Combine original tags with additional architectural terms
                const allTags = [...new Set([...tags, ...additionalTags])];
                console.log('Combined tags:', allTags);
                
                // Filter and categorize tags
                imageTags = {
                    styles: allTags.filter(tag => architecturalTerms.styles.includes(tag)),
                    elements: allTags.filter(tag => architecturalTerms.elements.includes(tag)),
                    materials: allTags.filter(tag => architecturalTerms.materials.includes(tag)),
                    features: allTags.filter(tag => architecturalTerms.features.includes(tag)),
                    spaces: allTags.filter(tag => architecturalTerms.spaces.includes(tag)),
                    characteristics: allTags.filter(tag => architecturalTerms.characteristics.includes(tag)),
                    vibes: allTags.filter(tag => architecturalTerms.vibes.includes(tag))
                };

                // Ensure at least three tags in each category if we have any tags
                if (allTags.length > 0) {
                    // Default tags for each category
                    const defaultTags = {
                        styles: ['contemporary', 'modern', 'minimalist'],
                        elements: ['building', 'structure', 'facade'],
                        materials: ['concrete', 'glass', 'steel'],
                        features: ['modern', 'sustainable', 'efficient'],
                        spaces: ['interior', 'public space', 'circulation'],
                        characteristics: ['openness', 'transparency', 'fluidity'],
                        vibes: ['modern', 'minimal', 'clean']
                    };

                    // Add default tags if category is empty or has less than 3 tags
                    Object.entries(defaultTags).forEach(([category, defaults]) => {
                        if (imageTags[category].length < 3) {
                            // Add missing tags from defaults
                            defaults.forEach(tag => {
                                if (!imageTags[category].includes(tag)) {
                                    imageTags[category].push(tag);
                                }
                            });
                        }
                    });

                    // Ensure we have at least 3 tags in each category
                    Object.entries(imageTags).forEach(([category, tags]) => {
                        if (tags.length < 3) {
                            // Add complementary tags based on existing ones
                            if (category === 'styles') {
                                if (tags.includes('modern')) {
                                    tags.push('contemporary', 'minimalist');
                                } else if (tags.includes('contemporary')) {
                                    tags.push('modern', 'minimalist');
                                } else {
                                    tags.push('modern', 'contemporary');
                                }
                            } else if (category === 'elements') {
                                if (tags.includes('building')) {
                                    tags.push('structure', 'facade');
                                } else if (tags.includes('structure')) {
                                    tags.push('building', 'facade');
                                } else {
                                    tags.push('building', 'structure');
                                }
                            } else if (category === 'materials') {
                                if (tags.includes('concrete')) {
                                    tags.push('glass', 'steel');
                                } else if (tags.includes('glass')) {
                                    tags.push('concrete', 'steel');
                                } else {
                                    tags.push('concrete', 'glass');
                                }
                            } else if (category === 'features') {
                                if (tags.includes('modern')) {
                                    tags.push('sustainable', 'efficient');
                                } else if (tags.includes('sustainable')) {
                                    tags.push('modern', 'efficient');
                                } else {
                                    tags.push('modern', 'sustainable');
                                }
                            } else if (category === 'spaces') {
                                if (tags.includes('interior')) {
                                    tags.push('public space', 'circulation');
                                } else if (tags.includes('public space')) {
                                    tags.push('interior', 'circulation');
                                } else {
                                    tags.push('interior', 'public space');
                                }
                            } else if (category === 'characteristics') {
                                if (tags.includes('openness')) {
                                    tags.push('transparency', 'fluidity');
                                } else if (tags.includes('transparency')) {
                                    tags.push('openness', 'fluidity');
                                } else {
                                    tags.push('openness', 'transparency');
                                }
                            } else if (category === 'vibes') {
                                if (tags.includes('modern')) {
                                    tags.push('minimal', 'clean');
                                } else if (tags.includes('minimal')) {
                                    tags.push('modern', 'clean');
                                } else {
                                    tags.push('modern', 'minimal');
                                }
                            }
                        }
                    });
                }
            }
        }

        // Get the analysis from OpenAI
        const analysis = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You are an architectural critic and analyst. Provide a detailed analysis of the architectural image in ${inputLanguage === 'ko' ? 'Korean' : 'English'} in the following format:\n\n${inputLanguage === 'ko' ? '비판 분석:' : 'CRITIQUE ANALYSIS:'}\n[Provide a comprehensive analysis of the architectural elements, style, and design principles. Include specific details about form, space, materials, and their relationships. Minimum 300 words.]\n\n${inputLanguage === 'ko' ? '개선 계획:' : 'IMPROVEMENT PLAN:'}\n[Provide detailed suggestions for improvements, numbered list. Each suggestion should include specific examples and practical applications. Minimum 200 words.]`
                },
                {
                    role: "user",
                    content: `Analyze this architectural image and provide a detailed critique and improvement plan. Focus on architectural elements, style, and design principles.\n\nImage Description: ${inputCritique}`
                }
            ],
            temperature: 0.7,
            max_tokens: 3000
        });

        // Split the analysis into critique and improvements
        const fullAnalysis = analysis.choices[0].message.content;
        const parts = fullAnalysis.split(/IMPROVEMENT PLAN:|개선 계획:/);
        const analysisCritique = parts[0].replace(/CRITIQUE ANALYSIS:|비판 분석:/, '').trim();
        const analysisImprovements = parts[1] ? parts[1].trim() : '';

        const response = {
            tags: imageTags,
            critique: analysisCritique,
            improvements: analysisImprovements
        };

        // Get references based on critique and tags
        try {
            const references = await getReferences(inputCritique, imageTags, inputLanguage);
            response.references = references;
        } catch (error) {
            console.error('Error getting references:', error);
            response.references = {
                title: inputLanguage === 'ko' ? "참고 자료" : "References",
                items: []
            };
        }

        console.log('Sending response:', response);
        res.json(response);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

async function getReferences(critique, tags, language) {
    const references = {
        title: language === 'ko' ? "참고 자료" : "References",
        items: []
    };

    try {
        // Get references using OpenAI
        const referencesResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You are an architectural reference expert. Based on the critique and tags, suggest 4 relevant architectural projects. For each project, provide:
                    - Project name and architect
                    - A detailed description of why it's relevant to the critique
                    - Key architectural features that relate to the critique
                    Format in JSON:
                    {
                        "projects": [
                            {
                                "title": "Project Name",
                                "architect": "Architect Name",
                                "description": "Detailed description of the project",
                                "relevance": "Why this project is relevant to the critique",
                                "key_features": ["Feature 1", "Feature 2", "Feature 3"]
                            }
                        ]
                    }
                    Make sure to always include all fields, especially key_features as an array.`
                },
                {
                    role: "user",
                    content: `Based on this architectural critique and tags, suggest 4 relevant architectural projects:\n\nCritique: ${critique}\n\nTags: ${JSON.stringify(tags)}`
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });

        // Parse the response
        const responseText = referencesResponse.choices[0].message.content;
        let projectsData;
        try {
            projectsData = JSON.parse(responseText);
        } catch (error) {
            console.error('Error parsing references JSON:', error);
            return references;
        }

        // Convert to our reference format
        if (projectsData && projectsData.projects && Array.isArray(projectsData.projects)) {
            references.items = projectsData.projects.map(project => ({
                source: 'reference',
                title: project.title || 'Unknown Project',
                architect: project.architect || 'Unknown Architect',
                description: project.description || '',
                relevance: language === 'ko' ? 
                    `${project.title || 'Unknown Project'} - ${project.relevance || ''}` :
                    project.relevance || '',
                key_features: Array.isArray(project.key_features) ? project.key_features : []
            }));
        }

        return references;
    } catch (error) {
        console.error('Error in getReferences:', error);
        return references;
    }
}

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Environment variables loaded:', { token: process.env.HUGGINGFACE_API_KEY ? 'Token exists' : 'No token found' });
});