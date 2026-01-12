import {
  Container,
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  UnorderedList,
  ListItem,
  Divider,
  Badge,
} from "@chakra-ui/react";
import Head from "next/head";
import MetaHead from "../components/MetaHead";
import { useRouter } from "next/router";

export default function WorldCupQuizLanding() {
  const router = useRouter();

  // Mini FAQ Schema for World Cup Quiz
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What World Cup matches are featured in FootyGuessr?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our database features iconic World Cup moments from multiple tournaments, including legendary finals, historic group stage matches, and unforgettable moments that changed football. From classic matches of the 1970s to modern World Cup epics, FootyGuessr covers the complete history of football's greatest tournament."
        }
      },
      {
        "@type": "Question",
        "name": "How can I improve at identifying World Cup teams?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Study national team colors, badge designs, and sponsor patterns from different World Cup eras. Learn the evolution of team kits over the decades. Focus on iconic matches like finals, semi-finals, and legendary upsets. The more World Cup history you know, the better you'll perform in FootyGuessr."
        }
      },
      {
        "@type": "Question",
        "name": "Is World Cup quiz harder than club football?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "World Cup questions can be challenging because national teams change kits less frequently than clubs, making them harder to distinguish. However, iconic World Cup moments are often more memorable to fans. Our adaptive difficulty system adjusts to your skill level whether you're answering about club or international football."
        }
      }
    ]
  };

  return (
    <>
      <MetaHead
        title="World Cup Football Quiz - Guess Iconic International Matches"
        description="Test your World Cup knowledge with FootyGuessr's World Cup quiz! Identify legendary World Cup matches, finals, and iconic international football moments. Free online football trivia."
        url="https://footyguessr.io/world-cup-quiz"
      />
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </Head>
      <Container maxW="container.lg" p={6}>
        <VStack spacing={8} align="stretch">
          {/* Hero Section */}
          <Box textAlign="center" mt={8}>
            <Heading as="h1" size="2xl" mb={3}>
              🏆 World Cup Football Quiz
            </Heading>
            <HStack justify="center" mb={4}>
              <Badge colorScheme="yellow" variant="solid" fontSize="md">
                International Matches
              </Badge>
              <Badge colorScheme="red" variant="solid" fontSize="md">
                Iconic Moments
              </Badge>
            </HStack>
            <Text fontSize="xl" color="gray.700" maxW="800px" mx="auto">
              Test your knowledge of legendary World Cup matches, historic finals, and unforgettable international football moments.
            </Text>
          </Box>

          {/* Description */}
          <Box maxW="800px" mx="auto">
            <Text fontSize="lg" mb={4} lineHeight="1.8">
              The FIFA World Cup is football's greatest stage—where nations compete for glory, underdogs topple favorites, and legends are born. From the first World Cup in 1930 to today's modern tournaments, the competition has produced some of the most iconic and memorable moments in all of sports. Now you can test your knowledge of these legendary matches with FootyGuessr's World Cup quiz.
            </Text>
            <Text fontSize="lg" mb={4} lineHeight="1.8">
              Our curated collection of World Cup matches spans decades of international football history. Identify the teams, recall the final scores, and relive the greatest moments that defined entire nations' footballing legacies. Whether it's the hand of god, the miss heard 'round the world, or a sublime team goal, these are the moments that football fans never forget.
            </Text>
            <Text fontSize="lg" lineHeight="1.8">
              World Cup football is different from club football—the intensity is higher, the stakes are enormous, and national pride is on the line. The kits change less frequently, making team identification a true test of football knowledge. Can you recognize legendary teams from their colors, badges, and era? Are you a true World Cup expert? Find out by playing FootyGuessr's World Cup quiz.
            </Text>
          </Box>

          {/* Why World Cup Quiz Matters */}
          <Box bg="yellow.50" p={6} borderRadius="lg" maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={4}>
              Why World Cup History Matters
            </Heading>
            <UnorderedList spacing={3} fontSize="lg" stylePosition="inside">
              <ListItem>
                <strong>Iconic Moments:</strong> World Cup matches are global events watched by billions—these are football's most memorable moments
              </ListItem>
              <ListItem>
                <strong>National Pride:</strong> Every match carries the hopes and dreams of entire nations
              </ListItem>
              <ListItem>
                <strong>Historic Upsets:</strong> The World Cup is where minnows topple giants and new legends emerge
              </ListItem>
              <ListItem>
                <strong>Legendary Players:</strong> Pelé, Maradona, Ronaldo, Messi—World Cup greatness defines careers
              </ListItem>
              <ListItem>
                <strong>Global Connection:</strong> World Cup unites fans worldwide like no other sporting event
              </ListItem>
              <ListItem>
                <strong>Unforgettable Drama:</strong> Penalty shootouts, last-minute goals, controversial decisions—the World Cup has it all
              </ListItem>
            </UnorderedList>
          </Box>

          {/* Featured World Cup Eras */}
          <Box maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={6}>
              World Cup Eras in FootyGuessr
            </Heading>
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Golden Era (1970s-1980s)
                </Heading>
                <Text color="gray.700" fontSize="md">
                  Brazil's dominance, West Germany's precision, and the theatrical brilliance of international football. Iconic matches featuring Pelé, Beckenbauer, and the birth of modern World Cup tradition.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Maradona Era (1986-1990)
                </Heading>
                <Text color="gray.700" fontSize="md">
                  Diego Maradona single-handedly carried Argentina to glory. Controversial moments, sublime individual brilliance, and the drama that defined international football in the late 1980s.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Modern Era (1990s-2000s)
                </Heading>
                <Text color="gray.700" fontSize="md">
                  Zidane, Ronaldo, Ronaldinho—the evolution of modern football. Penalty shootouts, defensive masterclasses, and the rise of European football dominance on the World Cup stage.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Contemporary World Cup (2010s-Present)
                </Heading>
                <Text color="gray.700" fontSize="md">
                  Messi vs. Ronaldo era competitions, Germany's four-year dynasty, and the unpredictability of modern international football. Recent tournaments with new narratives and emerging powerhouses.
                </Text>
              </Box>
            </VStack>
          </Box>

          {/* How to Master World Cup */}
          <Box bg="red.50" p={6} borderRadius="lg" maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={4}>
              How to Master World Cup Football Trivia
            </Heading>
            <UnorderedList spacing={3} fontSize="md" stylePosition="inside" color="gray.800">
              <ListItem>
                <strong>Learn Every Final:</strong> World Cup finals are the most iconic matches—know each winning team and score
              </ListItem>
              <ListItem>
                <strong>Study Kit Evolution:</strong> National team colors stayed relatively consistent—use this to your advantage
              </ListItem>
              <ListItem>
                <strong>Know Tournament Hosts:</strong> Host nations often reach finals or have better results—context helps identification
              </ListItem>
              <ListItem>
                <strong>Remember Legendary Upsets:</strong> When a smaller nation beats a powerhouse, it's usually a World Cup classic
              </ListItem>
              <ListItem>
                <strong>Recognize Stadium Landmarks:</strong> Some finals were played at iconic stadiums—visual cues matter
              </ListItem>
              <ListItem>
                <strong>Study Player Peak Years:</strong> When a player is at their best, their team usually plays World Cup football
              </ListItem>
            </UnorderedList>
          </Box>

          {/* CTA Buttons */}
          <Box textAlign="center" my={8}>
            <Heading as="h2" size="lg" mb={6}>
              Ready to Test Your World Cup Knowledge?
            </Heading>
            <HStack spacing={4} justify="center" flexWrap="wrap">
              <Button
                colorScheme="blue"
                size="lg"
                px={8}
                py={6}
                fontSize="lg"
                onClick={() => router.push("/game?mode=single")}
              >
                🎮 Play World Cup Quiz
              </Button>
              <Button
                colorScheme="orange"
                size="lg"
                px={8}
                py={6}
                fontSize="lg"
                onClick={() => router.push("/game?mode=pvp")}
              >
                ⚔️ Challenge a Friend
              </Button>
            </HStack>
          </Box>

          <Divider my={4} />

          {/* FAQ Section */}
          <Box maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={6}>
              Frequently Asked Questions
            </Heading>
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading as="h3" size="md" mb={2}>
                  What World Cup matches are featured in FootyGuessr?
                </Heading>
                <Text color="gray.700">
                  Our database features iconic World Cup moments from multiple tournaments, including legendary finals, historic group stage matches, and unforgettable moments that changed football. From classic matches of the 1970s to modern World Cup epics, FootyGuessr covers the complete history of football's greatest tournament.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  How can I improve at identifying World Cup teams?
                </Heading>
                <Text color="gray.700">
                  Study national team colors, badge designs, and sponsor patterns from different World Cup eras. Learn the evolution of team kits over the decades. Focus on iconic matches like finals, semi-finals, and legendary upsets. The more World Cup history you know, the better you'll perform in FootyGuessr.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Is World Cup quiz harder than club football?
                </Heading>
                <Text color="gray.700">
                  World Cup questions can be challenging because national teams change kits less frequently than clubs, making them harder to distinguish. However, iconic World Cup moments are often more memorable to fans. Our adaptive difficulty system adjusts to your skill level whether you're answering about club or international football.
                </Text>
              </Box>
            </VStack>
          </Box>

          {/* Bottom CTA */}
          <Box textAlign="center" mt={8} mb={8}>
            <Text fontSize="lg" color="gray.700" mb={4}>
              Experience the magic of World Cup football. Identify legendary teams, relive historic moments, and prove you're a true international football expert.
            </Text>
            <Button
              colorScheme="green"
              size="lg"
              px={10}
              py={6}
              fontSize="lg"
              onClick={() => router.push("/game?mode=single")}
            >
              🚀 Start Playing Now
            </Button>
          </Box>
        </VStack>
      </Container>
    </>
  );
}
